import fs from "fs";
import os from "os";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { database } from "../index.js";
import { metricsDb } from "../metrics-db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// uploads лежит на уровень выше (server/uploads/)
const UPLOADS_DIR = path.join(__dirname, "../uploads");

// Отдельный multer для sync-эндпоинтов: пишет во временную папку ОС,
// чтобы req.file.path != targetPath и existsSync не давал ложный positive.
const uploadTemp = multer({ dest: os.tmpdir() });

function verifyApiKey(req, res, next) {
  const key = process.env.SYNC_API_KEY;
  if (!key)
    return res
      .status(503)
      .json({ error: "Sync not configured on this server" });

  const auth = req.headers["authorization"] || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!provided || provided !== key) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export const syncRoutes = (app, upload) => {
  // GET /api/sync/export?since=<unix_ms>
  // Возвращает все записи (songs + stacks), изменённые после `since`.
  // Включает soft-deleted записи, чтобы реплика могла их удалить у себя.
  app.get("/api/sync/export", verifyApiKey, (req, res) => {
    const since = parseInt(req.query.since) || 0;

    database.find(
      {
        docType: { $in: ["song", "stack"] },
        updatedAt: { $gt: since },
      },
      (err, docs) => {
        if (err) return res.status(500).json({ error: err.message });

        const songs = docs.filter((d) => d.docType === "song");
        const stacks = docs.filter((d) => d.docType === "stack");

        const deletedSongIds = songs
          .filter((d) => d.deletedAt && d.deletedAt > since)
          .map((d) => d._id);
        const deletedStackIds = stacks
          .filter((d) => d.deletedAt && d.deletedAt > since)
          .map((d) => d._id);

        const liveSongs = songs.filter((d) => !d.deletedAt);
        const liveStacks = stacks.filter((d) => !d.deletedAt);

        res.json({
          timestamp: Date.now(),
          songs: liveSongs,
          stacks: liveStacks,
          deletedSongIds,
          deletedStackIds,
        });
      },
    );
  });

  // GET /api/sync/ids
  // Возвращает только ID всех живых songs и stacks.
  // Дополнительно возвращает songsWithMissingFiles — песни, у которых в БД
  // есть filename, но файл физически отсутствует на диске мастера.
  // Используется локальным сервером для fullReconciliation.
  app.get("/api/sync/ids", verifyApiKey, (req, res) => {
    database.find(
      { docType: { $in: ["song", "stack"] }, deletedAt: { $exists: false } },
      (err, docs) => {
        if (err) return res.status(500).json({ error: err.message });

        const songDocs = docs.filter((d) => d.docType === "song");
        const stackDocs = docs.filter((d) => d.docType === "stack");

        const songIds = songDocs.map((d) => d._id);
        const stackIds = stackDocs.map((d) => d._id);

        // Песни, у которых есть filename в БД, но файл не лежит на диске
        const songsWithMissingFiles = songDocs
          .filter((d) => {
            const filename = d.file?.filename;
            if (!filename) return false;
            return !fs.existsSync(path.join(UPLOADS_DIR, filename));
          })
          .map((d) => ({
            _id: d._id,
            filename: d.file.filename,
            mimetype: d.file?.mimetype,
          }));

        res.json({ songIds, stackIds, songsWithMissingFiles });
      },
    );
  });

  // POST /api/sync/push-file
  // Принимает файл с локального сервера и сохраняет его на диск мастера.
  // БД не трогает — только восстанавливает файл на диске.
  // Тело: multipart/form-data, поле "file" + поле "filename"
  //
  // ВАЖНО: используем uploadTemp (os.tmpdir()), а не основной multer.
  // Основной multer кладёт файл сразу в server/uploads/ с тем же именем,
  // после чего existsSync(targetPath) возвращает true (ложный positive),
  // код входит в ветку "already exists" и fs.unlinkSync УДАЛЯЕТ только что принятый файл.
  // uploadTemp пишет во временную папку ОС → req.file.path ≠ targetPath → нет коллизий.
  app.post(
    "/api/sync/push-file",
    verifyApiKey,
    uploadTemp.single("file"),
    (req, res) => {
      console.log(
        `[sync/push-file] получен запрос: originalname=${req.file?.originalname}, body.filename=${req.body?.filename}`,
      );

      if (!req.file) return res.status(400).json({ error: "Файл не получен" });

      const targetFilename = req.body.filename || req.file.originalname;
      if (!targetFilename) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Не указано имя файла" });
      }

      const targetPath = path.join(UPLOADS_DIR, targetFilename);
      console.log(`[sync/push-file] tmp=${req.file.path} → target=${targetPath}`);

      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(req.file.path);
        console.log(`[sync/push-file] файл уже есть на диске: ${targetFilename}`);
        return res.json({ status: "ok", note: "already exists" });
      }

      // Пробуем rename (быстро, в пределах одной ФС).
      // Если tmpdir и uploads на разных разделах — rename упадёт с EXDEV,
      // в этом случае делаем copy + unlink.
      try {
        fs.renameSync(req.file.path, targetPath);
      } catch (e) {
        if (e.code === "EXDEV") {
          try {
            fs.copyFileSync(req.file.path, targetPath);
            fs.unlinkSync(req.file.path);
          } catch (e2) {
            console.error(`[sync/push-file] copyFileSync failed:`, e2.message);
            return res.status(500).json({ error: e2.message });
          }
        } else {
          console.error(`[sync/push-file] renameSync failed:`, e.message);
          return res.status(500).json({ error: e.message });
        }
      }

      const size = fs.statSync(targetPath).size;
      console.log(`[sync/push-file] файл сохранён: ${targetFilename} (${size} байт)`);
      res.json({ status: "ok", filename: targetFilename, size });
    },
  );

  // POST /api/sync/push-song
  // Принимает песню с локального сервера и сохраняет на мастере.
  // Тело: multipart/form-data
  //   doc  — JSON-строка с полным документом песни
  //   file — PDF-файл (опционально, если ещё не был на мастере)
  //
  // Тоже использует uploadTemp по той же причине — чтобы multer не клал файл
  // прямо в uploads/ и не создавал коллизию при проверке existsSync.
  app.post(
    "/api/sync/push-song",
    verifyApiKey,
    uploadTemp.single("file"),
    (req, res) => {
      let doc;
      try {
        doc = JSON.parse(req.body.doc);
      } catch {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Некорректный JSON в поле doc" });
      }

      // Если файл пришёл — кладём его с оригинальным именем из документа
      if (req.file && doc.file?.filename) {
        const targetPath = path.join(UPLOADS_DIR, doc.file.filename);
        if (!fs.existsSync(targetPath)) {
          try {
            fs.renameSync(req.file.path, targetPath);
          } catch (e) {
            if (e.code === "EXDEV") {
              fs.copyFileSync(req.file.path, targetPath);
              fs.unlinkSync(req.file.path);
            } else throw e;
          }
          console.log(`[sync/push] Сохранён файл: ${doc.file.filename}`);
        } else {
          fs.unlinkSync(req.file.path);
        }
      }

      // Upsert документа в БД мастера
      database.update({ _id: doc._id }, doc, { upsert: true }, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log(`[sync/push] Песня upserted: ${doc._id}`);
        res.json({ status: "ok", _id: doc._id });
      });
    },
  );

  // POST /api/sync/push-stack
  // Принимает стопку с локального сервера и сохраняет на мастере.
  // Тело: application/json — полный документ стопки
  app.post("/api/sync/push-stack", verifyApiKey, (req, res) => {
    const doc = req.body;
    if (!doc?._id) return res.status(400).json({ error: "Отсутствует _id" });

    database.update({ _id: doc._id }, doc, { upsert: true }, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      console.log(`[sync/push] Стопка upserted: ${doc._id}`);
      res.json({ status: "ok", _id: doc._id });
    });
  });

  // GET /api/sync/metrics?limit=N&from=<unix_ms>&to=<unix_ms>
  // Возвращает записи метрик синхронизации из sync_metrics.db.
  // Параметры (все опциональны):
  //   limit  — максимум записей (default: 200)
  //   from   — unix timestamp нижней границы (включительно)
  //   to     — unix timestamp верхней границы (включительно)
  //
  // Дополнительно возвращает агрегированную сводку по всем записям в выборке:
  //   summary.avgLagMs, summary.avgReductionRatio, summary.totalSyncs и т.д.
  app.get("/api/sync/metrics", verifyApiKey, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const from = parseInt(req.query.from) || 0;
    const to = parseInt(req.query.to) || Date.now();

    const query = { timestamp: { $gte: from, $lte: to } };

    metricsDb
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec((err, docs) => {
        if (err) return res.status(500).json({ error: err.message });

        // Агрегированная сводка для удобства анализа
        const syncDocs = docs.filter((d) => d.type === "delta_sync");
        const summary =
          syncDocs.length === 0
            ? null
            : {
                totalSyncs: syncDocs.length,

                // Метрика №2 — Sync Lag
                lag: {
                  avgMs: Math.round(
                    syncDocs
                      .filter((d) => d.lag?.count > 0)
                      .reduce((s, d) => s + d.lag.avgMs, 0) /
                      (syncDocs.filter((d) => d.lag?.count > 0).length || 1),
                  ),
                  medianOfMediansMs: median(
                    syncDocs.filter((d) => d.lag?.count > 0).map((d) => d.lag.medianMs),
                  ),
                  p95OfP95Ms: percentile95(
                    syncDocs.filter((d) => d.lag?.count > 0).map((d) => d.lag.p95Ms),
                  ),
                  syncsWithChanges: syncDocs.filter((d) => d.lag?.count > 0).length,
                },

                // Метрика №3 — Bandwidth Efficiency
                bandwidth: {
                  avgReductionRatio: parseFloat(
                    (
                      syncDocs.reduce((s, d) => s + (d.bandwidth?.reductionRatio ?? 0), 0) /
                      syncDocs.length
                    ).toFixed(4),
                  ),
                  avgDeltaBytes: Math.round(
                    syncDocs.reduce((s, d) => s + (d.bandwidth?.deltaBytes ?? 0), 0) /
                      syncDocs.length,
                  ),
                  totalDeltaBytes: syncDocs.reduce(
                    (s, d) => s + (d.bandwidth?.deltaBytes ?? 0),
                    0,
                  ),
                  syncsWithNoChanges: syncDocs.filter(
                    (d) => d.bandwidth?.deltaRecords === 0,
                  ).length,
                },
              };

        res.json({ metrics: docs, summary });
      });
  });

  // GET /api/health — проверка доступности сервера (без аутентификации)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", ts: Date.now() });
  });
};

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function percentile95(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length * 0.95)];
}
