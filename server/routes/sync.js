import fs from "fs";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { database } from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// uploads лежит на уровень выше (server/uploads/)
const UPLOADS_DIR = path.join(__dirname, "../uploads");

function verifyApiKey(req, res, next) {
  const key = process.env.SYNC_API_KEY;
  if (!key) return res.status(503).json({ error: "Sync not configured on this server" });

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

        const songs  = docs.filter((d) => d.docType === "song");
        const stacks = docs.filter((d) => d.docType === "stack");

        const deletedSongIds  = songs.filter((d) => d.deletedAt && d.deletedAt > since).map((d) => d._id);
        const deletedStackIds = stacks.filter((d) => d.deletedAt && d.deletedAt > since).map((d) => d._id);

        const liveSongs  = songs.filter((d) => !d.deletedAt);
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
  // Используется локальным сервером для fullReconciliation:
  // находит записи, которых нет на мастере, и пушит их сюда.
  app.get("/api/sync/ids", verifyApiKey, (req, res) => {
    database.find(
      { docType: { $in: ["song", "stack"] }, deletedAt: { $exists: false } },
      (err, docs) => {
        if (err) return res.status(500).json({ error: err.message });
        const songIds  = docs.filter((d) => d.docType === "song").map((d) => d._id);
        const stackIds = docs.filter((d) => d.docType === "stack").map((d) => d._id);
        res.json({ songIds, stackIds });
      },
    );
  });

  // POST /api/sync/push-song
  // Принимает песню с локального сервера и сохраняет на мастере.
  // Тело: multipart/form-data
  //   doc  — JSON-строка с полным документом песни
  //   file — PDF-файл (опционально, если ещё не был на мастере)
  app.post("/api/sync/push-song", verifyApiKey, upload.single("file"), (req, res) => {
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
        fs.renameSync(req.file.path, targetPath);
        console.log(`[sync/push] Сохранён файл: ${doc.file.filename}`);
      } else {
        // Файл уже есть на мастере — удаляем временный
        fs.unlinkSync(req.file.path);
      }
    }

    // Upsert документа в БД мастера
    database.update({ _id: doc._id }, doc, { upsert: true }, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      console.log(`[sync/push] Песня upserted: ${doc._id}`);
      res.json({ status: "ok", _id: doc._id });
    });
  });

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

  // GET /api/health — проверка доступности сервера (без аутентификации)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", ts: Date.now() });
  });
};
