#!/usr/bin/env node
// Разовая (или ручная) уборка БД и файловой системы — тонкая обёртка над
// cleanup-core.js для запуска без работающего сервера:
//   1. Удаляет файлы из uploads/, не привязанные ни к одной записи в БД
//   2. Жёстко удаляет soft-deleted записи старше --purge-days (по умолчанию 30)
//   3. Компактирует NeDB (сжимает append-only лог)
//
// Автоматический вариант этой же уборки работает внутри сервера раз в сутки
// (см. index.js) — этот скрипт нужен, только чтобы посмотреть вручную или
// прогнать раньше расписания.
//
// Флаги:
//   --dry-run      Показать что будет удалено, не удалять
//   --purge-days=N Возраст soft-deleted записей для жёсткого удаления (default: 30)

import "../nedb-compat.js";
import Datastore from "nedb";
import path from "path";
import { fileURLToPath } from "url";
import { runCleanup } from "../cleanup-core.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const PURGE_DAYS = parseInt(
  (args.find((a) => a.startsWith("--purge-days=")) || "--purge-days=30").split("=")[1],
);

async function main() {
  console.log(`[cleanup] ${DRY_RUN ? "DRY RUN — " : ""}режим очистки`);
  console.log(`[cleanup] Жёсткое удаление soft-deleted записей старше ${PURGE_DAYS} дней`);

  const database = new Datastore(path.join(SERVER_DIR, "database.db"));
  await new Promise((resolve, reject) => database.loadDatabase((err) => (err ? reject(err) : resolve())));

  const result = await runCleanup({
    database,
    uploadsDir: path.join(SERVER_DIR, "uploads"),
    dryRun: DRY_RUN,
    purgeDays: PURGE_DAYS,
  });

  console.log(`\n[cleanup] Файлов на диске: ${result.diskFileCount}`);
  console.log(`[cleanup] Привязанных к записям: ${result.referencedCount}`);
  console.log(`[cleanup] Осиротевших файлов: ${result.orphanFiles.length}`);
  result.orphanFiles.forEach(({ name, size }) => console.log(`  - ${name} (${(size / 1024).toFixed(1)} KB)`));
  if (!DRY_RUN && result.orphanFiles.length > 0) {
    console.log(`[cleanup] Удалено ${result.orphanFiles.length} файлов`);
  }

  console.log(`\n[cleanup] Soft-deleted записей старше ${PURGE_DAYS} дней: ${result.softDeleted.length}`);
  result.softDeleted.forEach((d) => {
    const age = Math.floor((Date.now() - d.deletedAt) / (24 * 60 * 60 * 1000));
    console.log(`  - [${d.docType || "unknown"}] ${d.title} (удалено ${age} дн. назад)`);
  });
  if (!DRY_RUN && result.purgedCount > 0) {
    console.log(`[cleanup] Жёстко удалено записей: ${result.purgedCount}`);
  }

  if (DRY_RUN) {
    console.log("\n[cleanup] DRY RUN завершён — ничего не изменено.");
    return;
  }

  console.log(
    `\n[cleanup] Итог: файлов удалено=${result.orphanFiles.length}, записей удалено=${result.purgedCount}`,
  );
}

main().catch((e) => {
  console.error("[cleanup] Сорвалось:", e);
  process.exit(1);
});
