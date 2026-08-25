#!/usr/bin/env node
// Разовая заплатка: 24-25.08.2026 optimize-scans.js переделал 32 скана
// правильно, но не смог проставить updatedAt в базе — на Node без
// util.isDate падало вообще любое обращение к nedb (см. nedb-compat.js,
// починка нужна была не в запросе, а в самом nedb). Сам optimize-scans.js
// это исправление уже получил, здесь — только точечная починка того, что
// уже переделано и лежит на диске.
//
// Использование: node scripts/fix-scan-timestamps.js

import "../nedb-compat.js";
import path from "path";
import { fileURLToPath } from "url";
import Datastore from "nedb";
import { pushLocalChangeToRemote } from "../push-remote.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..");

const FILENAMES = [
  "chaikovskiy-legend-xop1579812711.pdf",
  "shumgr.pdf",
  "Ах_ты_душечка.pdf",
  "В_Вифлееме_в_эти_дни.pdf",
  "В_Вифлееме_новость_пришла.pdf",
  "В_ночь_Рождества.pdf",
  "Вечернии_звон.pdf",
  "Вниз_по_матушке_по_Волге.pdf",
  "Вот_случилася_беда.pdf",
  "Всего-то_навсего_1.pdf",
  "Дин-дон.pdf",
  "За_тихои_рекою.pdf",
  "Как-то_ранним_утром.pdf",
  "Люблю_березу_русскую_1.pdf",
  "Любо_мне_когда_Дон_разливается.pdf",
  "Монастырь_над_рекои.pdf",
  "Ночь_тиха_над_Палестинои.pdf",
  "Ои_полна_полна_коробушка.pdf",
  "Песня_о_криницах.pdf",
  "По_Дону_гуляет_казак_молодои.pdf",
  "По_всему_свету.pdf",
  "Пролегала_путь-дорожка.pdf",
  "Пролегала_путь-дорожка_4.pdf",
  "Русь_называют_Святою.pdf",
  "Святая_ночь.pdf",
  "Слово_мама_-_дорогое.pdf",
  "Сохрани_Господь.pdf",
  "Степью_степью.pdf",
  "Темненькая_ночка.pdf",
  "Утешение_пастырю.pdf",
  "Эта_ночь_святая.pdf",
  "Эх_дороги.pdf",
];

async function main() {
  const db = new Datastore(path.join(SERVER_DIR, "database.db"));
  await new Promise((resolve, reject) => db.loadDatabase((err) => (err ? reject(err) : resolve())));

  const allDocs = await new Promise((resolve, reject) =>
    db.find({}, (err, docs) => (err ? reject(err) : resolve(docs))),
  );
  const docByFilename = new Map(allDocs.filter((d) => d.file?.filename).map((d) => [d.file.filename, d]));

  let fixed = 0;
  let missing = 0;

  for (const filename of FILENAMES) {
    const doc = docByFilename.get(filename);
    if (!doc) {
      console.warn(`[fix-timestamps] в базе не нашлась запись с файлом ${filename}`);
      missing++;
      continue;
    }

    const updatedAt = Date.now();
    await new Promise((resolve) => {
      db.update({ _id: doc._id }, { $set: { updatedAt } }, {}, (err) => {
        if (err) console.warn(`[fix-timestamps]   ${filename}: не удалось обновить — ${err.message}`);
        resolve();
      });
    });

    await pushLocalChangeToRemote({ ...doc, updatedAt }).catch((e) =>
      console.warn(`[fix-timestamps]   ${filename}: не удалось отправить на мастер — ${e.message}`),
    );

    console.log(`[fix-timestamps] ✓ ${filename}`);
    fixed++;
  }

  db.persistence.compactDatafile();
  console.log(`\n[fix-timestamps] Готово: поправлено ${fixed}, не найдено в базе ${missing}`);
}

main().catch((e) => {
  console.error("[fix-timestamps] Сорвалось:", e);
  process.exit(1);
});
