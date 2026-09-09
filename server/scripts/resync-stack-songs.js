#!/usr/bin/env node
// Приводит копии песен внутри стопок к нынешнему виду самих песен.
//
// Стопка хранит не ссылку на песню, а её копию целиком — вместе с именем
// файла. После замены скана у песни появляется новое имя файла (старое
// занято, сервер дописывает счётчик), а в стопке остаётся прежнее — и она
// показывает старую ноту. Сам старый файл при этом удаляется с диска, так
// что на планшете стопка отдаёт его же из кеша, будто ничего не менялось.
//
// С правкой в server/routes/songs.js это чинится само при каждом сохранении
// песни. Этот скрипт — разовая уборка того, что разъехалось раньше.
//
// Что НЕ делает:
//   • ничего не удаляет — только обновляет копии внутри стопок;
//   • не трогает поля, которые про место песни в программе: instanceId и
//     isReserve остаются как были;
//   • не трогает записи, для которых песни уже нет или она удалена —
//     такие просто перечисляет, чтобы было видно;
//   • не трогает стопки, где всё и так сходится.
//
// Флаги:
//   (без флагов)  Показать, что разъехалось, ничего не менять
//   --apply       Действительно исправить (сначала делает резервную копию)
//   --no-backup   Пропустить резервную копию (не делай так без причины)
//   --db <путь>   Взять другой файл базы — чтобы прогнать на копии

import "../nedb-compat.js";
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import Datastore from "nedb";
import { pushLocalChangeToRemote } from "../push-remote.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const SKIP_BACKUP = args.includes("--no-backup");
const dbFlagIndex = args.indexOf("--db");
const DB_PATH =
  dbFlagIndex !== -1 && args[dbFlagIndex + 1]
    ? path.resolve(args[dbFlagIndex + 1])
    : path.join(SERVER_DIR, "database.db");

const j = (v) => JSON.stringify(v ?? null);

/**
 * Разошлась ли копия в стопке с самой песней.
 *
 * updatedAt намеренно не сравниваем: он меняется при каждой синхронизации,
 * и по нему «разъехавшимися» оказались бы вообще все стопки, хотя показывают
 * они при этом верное. Нас интересует содержимое — файл, название, авторы,
 * репризы.
 */
function differs(entry, song) {
  return Object.keys(song).some(
    (key) => key !== "updatedAt" && j(entry?.[key]) !== j(song[key]),
  );
}

async function main() {
  console.log(`[resync-stacks] База: ${DB_PATH}`);
  const db = new Datastore(DB_PATH);
  await new Promise((resolve, reject) =>
    db.loadDatabase((err) => (err ? reject(err) : resolve())),
  );

  const all = await new Promise((resolve, reject) =>
    db.find({}, (err, docs) => (err ? reject(err) : resolve(docs))),
  );

  const songById = new Map(all.filter((d) => d.docType === "song").map((d) => [d._id, d]));
  const stacks = all.filter((d) => d.docType === "stack" && !d.deletedAt);

  const planned = [];   // стопки, которые надо поправить
  const orphans = [];   // записи без живой песни — только показываем

  for (const stack of stacks) {
    if (!Array.isArray(stack.songs) || stack.songs.length === 0) continue;

    const changes = [];
    const songs = stack.songs.map((entry) => {
      const song = entry?._id ? songById.get(entry._id) : null;

      if (!song || song.deletedAt) {
        if (entry?._id) {
          orphans.push({
            stack: stack.name || stack._id,
            entry: entry.name || entry._id,
            reason: song ? "песня удалена" : "песни нет в базе",
          });
        }
        return entry;
      }

      if (!differs(entry, song)) return entry;

      changes.push({
        name: song.name || song._id,
        oldFile: entry.file?.filename ?? "—",
        newFile: song.file?.filename ?? "—",
        oldName: entry.name,
        newName: song.name,
      });

      // Поля самой стопки возвращаем на место: они про порядок и резерв,
      // а не про песню
      return { ...entry, ...song, instanceId: entry.instanceId, isReserve: entry.isReserve };
    });

    if (changes.length > 0) planned.push({ stack, songs, changes });
  }

  console.log(`[resync-stacks] Живых стопок: ${stacks.length}`);
  console.log(`[resync-stacks] Стопок с разъехавшимися копиями: ${planned.length}\n`);

  for (const { stack, changes } of planned) {
    console.log(`  Стопка «${stack.name || stack._id}» (id: ${stack._id})`);
    for (const c of changes) {
      const fileChanged = c.oldFile !== c.newFile;
      const nameChanged = c.oldName !== c.newName;
      const what = [
        fileChanged ? `файл: ${c.oldFile} → ${c.newFile}` : null,
        nameChanged ? `название: «${c.oldName}» → «${c.newName}»` : null,
        !fileChanged && !nameChanged ? "прочие поля (авторы/репризы)" : null,
      ].filter(Boolean).join(", ");
      console.log(`     • ${c.name}: ${what}`);
    }
  }

  if (orphans.length > 0) {
    console.log(`\n[resync-stacks] Записи без живой песни — не трогаю (${orphans.length}):`);
    for (const o of orphans) console.log(`     • «${o.entry}» в стопке «${o.stack}» — ${o.reason}`);
  }

  if (planned.length === 0) {
    console.log("\n[resync-stacks] Всё сходится, чинить нечего.");
    return;
  }

  if (!APPLY) {
    console.log("\n[resync-stacks] Это холостой прогон — ничего не менялось.");
    console.log("[resync-stacks] Чтобы исправить, запусти ту же команду с флагом --apply");
    return;
  }

  if (!SKIP_BACKUP) {
    console.log("\n[resync-stacks] Делаю резервную копию перед началом...");
    execFileSync("bash", [path.join(__dirname, "backup.sh"), "before-resync-stack-songs"], {
      stdio: "inherit",
    });
  }

  let done = 0;
  for (const { stack, songs } of planned) {
    const updatedAt = Date.now();
    await new Promise((resolve) => {
      db.update({ _id: stack._id }, { $set: { songs, updatedAt } }, {}, (err) => {
        if (err) console.warn(`[resync-stacks]   ${stack.name}: не удалось обновить — ${err.message}`);
        resolve();
      });
    });
    await pushLocalChangeToRemote({ ...stack, songs, updatedAt }).catch((e) =>
      console.warn(`[resync-stacks]   ${stack.name}: не удалось отправить на мастер: ${e.message}`),
    );
    done++;
  }

  db.persistence.compactDatafile();

  console.log(`\n[resync-stacks] Готово: поправлено ${done} из ${planned.length}.`);
}

main().catch((e) => {
  console.error("[resync-stacks] Сорвалось:", e);
  process.exit(1);
});
