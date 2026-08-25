#!/usr/bin/env node
// Разово переделывает уже загруженные сканы ABBYY — те, что жмут страницы
// в JPEG2000/JBIG2 и потому листаются в разы медленнее остальных нот
// (разбор причины и рецепт переделки — TODO.md, пункт 2).
//
// Файлы без этих форматов не трогает: они и так открываются быстро,
// а лишний прогон только рискует испортить то, что не сломано.
//
// Флаги:
//   --dry-run    Показать, что будет переделано, ничего не менять
//   --no-backup  Пропустить автоматический бэкап (не делай так без причины)

import "../nedb-compat.js";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Datastore from "nedb";
import { pushLocalChangeToRemote } from "../push-remote.js";
import { needsOptimization, optimizeIfNeeded } from "../scan-optimizer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..");
const UPLOADS_DIR = path.join(SERVER_DIR, "uploads");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_BACKUP = args.includes("--no-backup");

async function main() {
  console.log(`[optimize-scans] ${DRY_RUN ? "DRY RUN — " : ""}поиск тяжёлых сканов в ${UPLOADS_DIR}`);

  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  // По файлу за раз, с именем перед проверкой — если где-то зависнет
  // (poppler такое умеет на отдельных PDF), сразу видно, на каком именно
  const candidates = [];
  for (const f of files) {
    process.stdout.write(`[optimize-scans] проверяю ${f}... `);
    const heavy = needsOptimization(path.join(UPLOADS_DIR, f));
    console.log(heavy ? "тяжёлый" : "ок");
    if (heavy) candidates.push(f);
  }

  console.log(`\n[optimize-scans] Всего PDF: ${files.length}, тяжёлых (JPEG2000/JBIG2): ${candidates.length}`);
  if (candidates.length === 0) {
    console.log("[optimize-scans] Переделывать нечего.");
    return;
  }
  candidates.forEach((f) => console.log(`  - ${f}`));

  if (DRY_RUN) {
    console.log("[optimize-scans] DRY RUN — ничего не менялось.");
    return;
  }

  if (!SKIP_BACKUP) {
    console.log("\n[optimize-scans] Делаю резервную копию перед началом...");
    execFileSync("bash", [path.join(__dirname, "backup.sh"), "before-optimize-scans"], { stdio: "inherit" });
  }

  const db = new Datastore(path.join(SERVER_DIR, "database.db"));
  await new Promise((resolve, reject) => db.loadDatabase((err) => (err ? reject(err) : resolve())));

  // Читаем все документы разом и сопоставляем по имени файла в JS, а меняем
  // уже по _id — так же, как это делают остальные места в проекте
  const allDocs = await new Promise((resolve, reject) =>
    db.find({}, (err, docs) => (err ? reject(err) : resolve(docs))),
  );
  const docByFilename = new Map(allDocs.filter((d) => d.file?.filename).map((d) => [d.file.filename, d]));

  let fixed = 0;
  let failed = 0;
  let savedBytes = 0;

  for (const filename of candidates) {
    const pdfPath = path.join(UPLOADS_DIR, filename);
    process.stdout.write(`\n[optimize-scans] ${filename}... `);

    const result = await optimizeIfNeeded(pdfPath);
    if (!result.optimized) {
      failed++;
      console.log(`✗ ${result.error || "не переделан"}`);
      continue;
    }

    savedBytes += result.originalSize - result.newSize;
    fixed++;
    console.log(
      `✓ ${(result.originalSize / 1024 / 1024).toFixed(1)} → ${(result.newSize / 1024 / 1024).toFixed(1)} МБ`,
    );

    // Файл на диске сменился незаметно для БД — без отметки времени
    // планшеты, уже скачавшие тяжёлую версию, не узнают о лёгкой
    // (сверка идёт по updatedAt, см. lib/cache-readiness.ts)
    const doc = docByFilename.get(filename);
    if (!doc) {
      console.warn(`[optimize-scans]   в базе не нашлась запись с файлом ${filename}, отметку не проставил`);
      continue;
    }

    const updatedAt = Date.now();
    await new Promise((resolve) => {
      db.update({ _id: doc._id }, { $set: { updatedAt } }, {}, (err) => {
        if (err) console.warn(`[optimize-scans]   не удалось обновить updatedAt: ${err.message}`);
        resolve();
      });
    });

    await pushLocalChangeToRemote({ ...doc, updatedAt }).catch((e) =>
      console.warn(`[optimize-scans]   не удалось отправить на мастер: ${e.message}`),
    );
  }

  db.persistence.compactDatafile();

  // savedBytes может быть отрицательным — цвет сохраняется намеренно
  // (см. optimize-scan.py) и иногда весит чуть больше исходного JPEG2000.
  // Смысл переделки не в размере, а в скорости открытия
  const sizeMb = Math.abs(savedBytes / 1024 / 1024).toFixed(1);
  const sizeNote = savedBytes >= 0 ? `освобождено ${sizeMb} МБ` : `вес вырос на ${sizeMb} МБ (это нормально — не убирали цвет)`;

  console.log("");
  console.log(`[optimize-scans] Готово: переделано ${fixed}, ошибок ${failed}, ${sizeNote}`);
  if (failed > 0) {
    console.log("[optimize-scans] Файлы с ошибками остались нетронутыми — оригинал не подменялся.");
  }
}

main().catch((e) => {
  console.error("[optimize-scans] Сорвалось:", e);
  process.exit(1);
});
