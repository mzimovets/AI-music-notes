// cleanup-core.js — общее ядро регулярной уборки: сироты в uploads (файлы,
// на которые больше никто не ссылается) и старые soft-deleted записи.
//
// Используется и разовым CLI-скриптом (scripts/cleanup.js — своя, отдельно
// открытая база, для запуска без работающего сервера), и автоматической
// уборкой раз в сутки прямо внутри сервера (см. index.js) — там нарочно
// передаётся тот же самый database, что и у остальных маршрутов: открывать
// вторую копию поверх того же файла базы рискованно, легко потерять
// параллельную запись.

import fs from "fs";
import path from "path";

/**
 * @param {object} opts
 * @param {import("nedb")} opts.database — уже открытый и загруженный Datastore
 * @param {string} opts.uploadsDir — путь до server/uploads
 * @param {boolean} [opts.dryRun] — только посчитать, не трогать файлы/записи
 * @param {number} [opts.purgeDays] — возраст soft-deleted записей для удаления
 */
export async function runCleanup({ database, uploadsDir, dryRun = false, purgeDays = 30 }) {
  const purgeThreshold = Date.now() - purgeDays * 24 * 60 * 60 * 1000;

  const allDocs = await new Promise((resolve, reject) =>
    database.find({}, (err, docs) => (err ? reject(err) : resolve(docs))),
  );

  // Имя файла ноты лежит внутри file.filename, а не прямо в записи
  const songs = allDocs.filter((d) => d.docType === "song");
  const referencedFiles = new Set(songs.map((d) => d.file?.filename).filter(Boolean));

  // Картинки разделов — отдельный документ, хранят путь ("/uploads/имя.jpg"),
  // а не голое имя файла
  const categoriesDoc = allDocs.find((d) => d.docType === "categories");
  if (Array.isArray(categoriesDoc?.items)) {
    for (const item of categoriesDoc.items) {
      if (typeof item.image === "string" && item.image.startsWith("/uploads/")) {
        referencedFiles.add(item.image.replace(/^\/uploads\//, ""));
      }
    }
  }

  // Файл только что загружен — на диске уже есть, а запись о нём в базе
  // появится через мгновение (сначала multer сохраняет файл, потом
  // сервер пишет документ). Автоматическая уборка может попасть точно в
  // этот промежуток — час запаса с большим избытком покрывает любую
  // реальную задержку и не даёт задеть то, что вот-вот привяжется
  const MIN_ORPHAN_AGE_MS = 60 * 60 * 1000;

  const diskFiles = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir).filter((f) => fs.statSync(path.join(uploadsDir, f)).isFile())
    : [];
  const orphanFiles = diskFiles
    .filter((f) => !referencedFiles.has(f))
    .map((f) => ({ name: f, stat: fs.statSync(path.join(uploadsDir, f)) }))
    .filter(({ stat }) => Date.now() - stat.mtimeMs > MIN_ORPHAN_AGE_MS)
    .map(({ name, stat }) => ({ name, size: stat.size }));

  if (!dryRun) {
    for (const { name } of orphanFiles) {
      try {
        fs.unlinkSync(path.join(uploadsDir, name));
      } catch {
        // Файл мог исчезнуть между чтением списка и удалением — не критично
      }
    }
  }

  const softDeleted = allDocs
    .filter((d) => d.deletedAt && d.deletedAt < purgeThreshold)
    .map((d) => ({ id: d._id, docType: d.docType, title: d.title || d.name || d._id, deletedAt: d.deletedAt }));

  let purgedCount = 0;
  if (softDeleted.length > 0 && !dryRun) {
    purgedCount = await new Promise((resolve, reject) =>
      database.remove({ _id: { $in: softDeleted.map((d) => d.id) } }, { multi: true }, (err, num) =>
        err ? reject(err) : resolve(num),
      ),
    );
    database.persistence.compactDatafile();
  }

  return {
    diskFileCount: diskFiles.length,
    referencedCount: referencedFiles.size,
    orphanFiles,
    softDeleted,
    purgedCount,
  };
}
