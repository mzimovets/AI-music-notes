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

/**
 * Регистр, ё/е, запятые и кавычки не должны мешать увидеть одинаковые
 * названия: «Ах ты, душечка» и «Ах ты душечка» — одно и то же.
 */
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

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

  /**
   * Связываем записи по двум признакам сразу: одинаковое название и
   * одинаковая основа имени файла. Одного названия мало — «Ах ты душечка»
   * могли завести второй раз чуть иначе, зато файл выдаёт повтор с головой
   * (сервер дописывает _1 к занятому имени). Одного файла тоже мало —
   * повтор могли загрузить из файла с другим именем.
   */
  const parent = new Map(live.map((d) => [d._id, d._id]));
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  };
  const union = (a, b) => parent.set(find(a), find(b));

  for (const key of ["name", "file"]) {
    const seen = new Map();
    for (const d of live) {
      const k = key === "name" ? norm(d.name) : fileBase(d.file?.filename);
      if (!k) continue;
      if (seen.has(k)) union(d._id, seen.get(k));
      else seen.set(k, d._id);
    }
  }

  const clusters = new Map();
  for (const d of live) {
    const root = find(d._id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(d);
  }

  const dupes = [...clusters.values()].filter((g) => g.length > 1);

  console.log(`[dupes] Живых партитур: ${live.length}`);
  console.log(`[dupes] Похожих групп: ${dupes.length}\n`);

  if (dupes.length === 0) {
    console.log("[dupes] Повторов не нашлось.");
    return;
  }

  for (const group of dupes.sort((a, b) => norm(a[0].name).localeCompare(norm(b[0].name), "ru"))) {
    const sameCategory = new Set(group.map((d) => d.category)).size === 1;
    const sameFileBase = new Set(group.map((d) => fileBase(d.file?.filename))).size === 1;

    // Одинаковое название, один раздел и одна основа имени файла — это тот
    // самый повтор: файл загрузили второй раз, и сервер дописал _1 к имени
    const likely = sameCategory && sameFileBase;

    console.log(`«${group[0].name}» — ${group.length} шт.${likely ? "   ← похоже на повтор, один лишний" : ""}`);
    for (const d of group) {
      const size = fileSize(d.file?.filename);
      // Название печатаем у каждой: в группу могли попасть записи, названия
      // которых отличаются запятой или мелкой правкой
      console.log(`    «${d.name}»`);
      console.log(`        файл: ${d.file?.filename ?? "без файла"}`);
      console.log(`        раздел: ${d.category ?? "—"}   размер: ${fmtSize(size)}   добавлена: ${fmtDate(d.updatedAt)}`);
    }
    if (!likely) {
      console.log("    (разные разделы или разные файлы — возможно, это всё же разные произведения)");
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
