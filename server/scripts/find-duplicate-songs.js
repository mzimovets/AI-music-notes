#!/usr/bin/env node
// Показывает партитуры с одинаковыми названиями — кандидаты в дубликаты.
//
// Только читает и печатает. Ничего не удаляет намеренно: одинаковое
// название ещё не значит дубликат (например, «Ave Maria» Вавилова и
// Шуберта — разные произведения), а решать, какую из двух оставить, может
// только человек. Удалять найденное нужно в самом приложении: тогда запись
// пометится удалённой, уедет на сервер и вычистится из памяти планшетов —
// прямая правка базы всего этого не сделает.
//
// Использование: node scripts/find-duplicate-songs.js

import "../nedb-compat.js";
import Datastore from "nedb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..");
const UPLOADS_DIR = path.join(SERVER_DIR, "uploads");

/** Пробелы по краям, регистр и ё/е не должны мешать увидеть одинаковые названия */
const norm = (s) => (s || "").trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");

/**
 * Имя файла без расширения и без хвоста _1, _2 — именно так сервер называет
 * второй файл с тем же именем. Совпадение таких «основ» — самый честный
 * признак случайного повтора: у двух разных произведений с одинаковым
 * названием («Ave Maria» Вавилова и Шуберта) имена файлов всё равно разные.
 */
const fileBase = (filename) =>
  (filename || "").replace(/\.[^.]+$/, "").replace(/_\d+$/, "").toLowerCase();

function fileSize(filename) {
  if (!filename) return null;
  try {
    return fs.statSync(path.join(UPLOADS_DIR, filename)).size;
  } catch {
    return null;
  }
}

const fmtSize = (b) => (b === null ? "файла нет" : `${(b / 1024 / 1024).toFixed(1)} МБ`);
const fmtDate = (ts) => (ts ? new Date(ts).toLocaleString("ru") : "—");

async function main() {
  const db = new Datastore(path.join(SERVER_DIR, "database.db"));
  await new Promise((resolve, reject) => db.loadDatabase((err) => (err ? reject(err) : resolve())));

  const songs = await new Promise((resolve, reject) =>
    db.find({ docType: "song" }, (err, docs) => (err ? reject(err) : resolve(docs))),
  );
  const live = songs.filter((d) => !d.deletedAt);

  const groups = new Map();
  for (const d of live) {
    const key = norm(d.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }

  const dupes = [...groups.values()].filter((g) => g.length > 1);

  console.log(`[dupes] Живых партитур: ${live.length}`);
  console.log(`[dupes] Названий, встречающихся больше одного раза: ${dupes.length}\n`);

  if (dupes.length === 0) {
    console.log("[dupes] Одинаковых названий нет.");
    return;
  }

  for (const group of dupes.sort((a, b) => norm(a[0].name).localeCompare(norm(b[0].name), "ru"))) {
    const sameCategory = new Set(group.map((d) => d.category)).size === 1;
    const sameFileBase = new Set(group.map((d) => fileBase(d.file?.filename))).size === 1;

    // Одинаковое название, один раздел и одна основа имени файла — это тот
    // самый повтор: файл загрузили второй раз, и сервер дописал _1 к имени
    const likely = sameCategory && sameFileBase;

    console.log(`«${group[0].name}» — ${group.length} шт.${likely ? "   ← похоже на повтор, один файл лишний" : ""}`);
    for (const d of group) {
      const size = fileSize(d.file?.filename);
      console.log(`    ${d.file?.filename ?? "без файла"}`);
      console.log(`        раздел: ${d.category ?? "—"}   размер: ${fmtSize(size)}   добавлена: ${fmtDate(d.updatedAt)}`);
    }
    if (!likely) {
      console.log("    (файлы разные — скорее всего, это разные произведения с одним названием)");
    }
    console.log();
  }

  console.log("[dupes] Ничего не удалено — удаляйте лишнее в самом приложении,");
  console.log("        чтобы удаление разошлось на сервер и на планшеты.");
}

main().catch((e) => {
  console.error("[dupes] Сорвалось:", e);
  process.exit(1);
});
