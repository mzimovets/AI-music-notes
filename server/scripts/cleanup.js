#!/usr/bin/env node
// Очистка БД и файловой системы:
//   1. Удаляет PDF-файлы из uploads/, не привязанные ни к одной записи в БД
//   2. Жёстко удаляет soft-deleted записи старше --purge-days (по умолчанию 30)
//   3. Компактирует NeDB (сжимает append-only лог)
//
// Флаги:
//   --dry-run     Показать что будет удалено, не удалять
//   --purge-days=N Возраст soft-deleted записей для жёсткого удаления (default: 30)

import Datastore from "nedb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const PURGE_DAYS = parseInt(
  (args.find((a) => a.startsWith("--purge-days=")) || "--purge-days=30").split("=")[1]
);
const PURGE_THRESHOLD = Date.now() - PURGE_DAYS * 24 * 60 * 60 * 1000;

console.log(`[cleanup] ${DRY_RUN ? "DRY RUN — " : ""}режим очистки`);
console.log(`[cleanup] Жёсткое удаление soft-deleted записей старше ${PURGE_DAYS} дней`);

const db = new Datastore(path.join(SERVER_DIR, "database.db"));

db.loadDatabase((err) => {
  if (err) {
    console.error("[cleanup] Ошибка загрузки БД:", err);
    process.exit(1);
  }

  db.find({}, (err, allDocs) => {
    if (err) {
      console.error("[cleanup] Ошибка чтения БД:", err);
      process.exit(1);
    }

    const songs = allDocs.filter((d) => d.docType === "song" || d.filename);
    const referencedFiles = new Set(
      songs.map((d) => d.filename).filter(Boolean)
    );

    // --- 1. Orphan PDF files ---
    const uploadsDir = path.join(SERVER_DIR, "uploads");
    let orphanFiles = [];

    if (fs.existsSync(uploadsDir)) {
      const diskFiles = fs.readdirSync(uploadsDir).filter((f) => {
        const stat = fs.statSync(path.join(uploadsDir, f));
        return stat.isFile();
      });

      orphanFiles = diskFiles.filter((f) => !referencedFiles.has(f));

      console.log(`\n[cleanup] Файлов на диске: ${diskFiles.length}`);
      console.log(`[cleanup] Привязанных к записям: ${referencedFiles.size}`);
      console.log(`[cleanup] Осиротевших файлов: ${orphanFiles.length}`);

      if (orphanFiles.length > 0) {
        orphanFiles.forEach((f) => {
          const filePath = path.join(uploadsDir, f);
          const size = fs.statSync(filePath).size;
          console.log(`  - ${f} (${(size / 1024).toFixed(1)} KB)`);
          if (!DRY_RUN) {
            fs.unlinkSync(filePath);
          }
        });
        if (!DRY_RUN) {
          console.log(`[cleanup] Удалено ${orphanFiles.length} файлов`);
        }
      }
    }

    // --- 2. Purge soft-deleted records ---
    const softDeleted = allDocs.filter(
      (d) => d.deletedAt && d.deletedAt < PURGE_THRESHOLD
    );

    console.log(`\n[cleanup] Soft-deleted записей старше ${PURGE_DAYS} дней: ${softDeleted.length}`);

    if (softDeleted.length === 0) {
      compactAndExit(db, orphanFiles.length, 0);
      return;
    }

    softDeleted.forEach((d) => {
      const age = Math.floor((Date.now() - d.deletedAt) / (24 * 60 * 60 * 1000));
      console.log(`  - [${d.docType || "unknown"}] ${d.title || d._id} (удалено ${age} дн. назад)`);
    });

    if (DRY_RUN) {
      compactAndExit(db, orphanFiles.length, softDeleted.length);
      return;
    }

    const ids = softDeleted.map((d) => d._id);
    db.remove({ _id: { $in: ids } }, { multi: true }, (err, numRemoved) => {
      if (err) {
        console.error("[cleanup] Ошибка удаления записей:", err);
        process.exit(1);
      }
      console.log(`[cleanup] Жёстко удалено записей: ${numRemoved}`);
      compactAndExit(db, orphanFiles.length, numRemoved);
    });
  });
});

function compactAndExit(db, filesRemoved, docsRemoved) {
  if (DRY_RUN) {
    console.log("\n[cleanup] DRY RUN завершён — ничего не изменено.");
    process.exit(0);
  }

  console.log("\n[cleanup] Компактирование БД...");
  db.persistence.compactDatafile();
  db.on("compaction.done", () => {
    console.log("[cleanup] БД скомпактирована.");
    console.log(`\n[cleanup] Итог: файлов удалено=${filesRemoved}, записей удалено=${docsRemoved}`);
    process.exit(0);
  });
}
