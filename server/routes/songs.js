import fs from "fs";
import path from "path";
import { database } from "../index.js";
import { pushLocalChangeToRemote } from "../push-remote.js";
import { optimizeIfNeeded } from "../scan-optimizer.js";

/**
 * Если загруженный скан оказался тяжёлым (JPEG2000/JBIG2 от ABBYY — самая
 * медленная распаковка из возможных, разбор — TODO.md, пункт 2), переделываем
 * его в обычный JPEG. В фоне, после ответа — не задерживает загрузку ноты, и
 * ничего не ломает, если на сервере не установлены нужные инструменты
 * (тогда просто ничего не делает).
 */
function optimizeUploadedScanInBackground(songId, filePath) {
  if (!filePath) return;
  optimizeIfNeeded(filePath).then((result) => {
    if (!result.optimized) return;
    database.update({ _id: songId }, { $set: { updatedAt: Date.now() } }, {}, (err) => {
      if (err) return console.log("err", err);
      database.findOne({ _id: songId }, (findErr, doc) => {
        if (!findErr && doc) pushLocalChangeToRemote(doc);
      });
    });
  });
}

export const songsRoutes = (app, urlencodedParser, upload) => {
  app.get("/song/:songId", (req, res) => {
    database.findOne({ _id: req.params.songId, deletedAt: { $exists: false } }, (err, doc) => {
      console.log("getting song: ", req.params.songId);
      if (err) console.log("no find", err);
      res.json({ status: "ok", doc });
    });
  });

  app.get("/songs", (req, res) => {
    database.find({ docType: "song", deletedAt: { $exists: false } }, (err, docs) => {
      if (err) console.log("err", err);
      res.json({ status: "ok", docs });
    });
  });

  app.get("/songs/:category", (req, res) => {
    console.log("GET songs category", req.params);
    database.find(
      { docType: "song", category: req.params.category, deletedAt: { $exists: false } },
      (err, docs) => {
        if (err) console.log("err", err);
        res.json({ status: "ok", docs });
      },
    );
  });

  app.post(
    "/song/:songId",
    urlencodedParser,
    upload.single("file"),
    (req, res) => {
      const now = Date.now();
      const serverSong = { ...req.body, file: req.file, updatedAt: now };
      if (serverSong.reprises) {
        try { serverSong.reprises = JSON.parse(serverSong.reprises); } catch { delete serverSong.reprises; }
      }
      database.insert({ _id: req.params.songId, ...serverSong }, (err, doc) => {
        console.log("adding song: ", req.params.songId, serverSong);
        if (err) console.log("err", err);
        res.json({ status: "ok", doc });
        // Мгновенный push на мастер (фоново, не блокирует ответ)
        if (!err && doc) pushLocalChangeToRemote(doc);
        if (!err && doc) optimizeUploadedScanInBackground(req.params.songId, req.file?.path);
      });
    },
  );

  app.post(
    "/song/:songId/:update",
    urlencodedParser,
    upload.single("file"),
    (req, res) => {
      const serverSong = { ...req.body, updatedAt: Date.now() };
      if (req.file && typeof req.file !== "string") {
        serverSong.file = req.file;
      }
      if (serverSong.reprises) {
        try { serverSong.reprises = JSON.parse(serverSong.reprises); } catch { serverSong.reprises = []; }
      } else {
        serverSong.reprises = [];
      }
      // Узнаём старое имя файла до перезаписи — если ноту редактируют с
      // новым сканом, старый файл иначе остаётся сиротой в uploads навсегда
      // (найдено на «Пролегала_путь-дорожка.pdf»: запись давно указывает на
      // другой файл, а этот так и лежит, ничем не занятый)
      database.findOne({ _id: req.params.songId }, (findOldErr, oldDoc) => {
        const oldFilename = !findOldErr ? oldDoc?.file?.filename : null;

        database.update(
          { _id: req.params.songId },
          { $set: { ...serverSong } },
          (err, num) => {
            console.log("edited song: ", req.params.songId);
            if (err) console.log("err", err);
            res.json({ status: "ok", doc: num });
            // Получаем обновлённый документ и пушим на мастер (фоново)
            if (!err) {
              database.findOne({ _id: req.params.songId }, (findErr, doc) => {
                if (!findErr && doc) pushLocalChangeToRemote(doc);
              });
            }
            if (!err) optimizeUploadedScanInBackground(req.params.songId, req.file?.path);

            if (!err && req.file && oldFilename && oldFilename !== req.file.filename) {
              const oldPath = path.join(req.file.destination, oldFilename);
              fs.unlink(oldPath, (unlinkErr) => {
                if (!unlinkErr) console.log(`Удалён старый файл ноты: ${oldFilename}`);
              });
            }
          },
        );
      });
    },
  );

  app.get("/song/:songId/:delete", urlencodedParser, (req, res) => {
    console.log("deleting song on server", req.params.songId, req.params.delete);
    // Soft delete — помечаем deletedAt вместо физического удаления,
    // чтобы локальные серверы узнали об удалении при следующей синхронизации
    database.update(
      { _id: req.params.songId },
      { $set: { deletedAt: Date.now(), updatedAt: Date.now() } },
      (err, num) => {
        console.log("soft-deleted song: ", req.params.songId, num);
        if (err) console.log("err", err);
        res.json({ status: "ok", num });
        // Получаем помеченный документ и пушим на мастер (фоново)
        if (!err) {
          database.findOne({ _id: req.params.songId }, (findErr, doc) => {
            if (!findErr && doc) pushLocalChangeToRemote(doc);
          });
        }
      },
    );
  });
};
