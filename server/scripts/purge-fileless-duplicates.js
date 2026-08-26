#!/usr/bin/env node
// Удаляет дубликаты партитур, у которых нет файла — если у той же самой
// партитуры (по названию) есть другая живая запись с файлом. Записи без
// файла и так ничего не открывают, только засоряют поиск и разделы.
//
// Ничего не удаляет молча и не трогает пары без явного дубликата: запись
// без файла помечается удалённой, только если рядом есть точно такая же
// по названию, но с файлом — иначе, возможно, файл ещё просто не успели
// прикрепить, и это не мусор.
//
// Удаляет как в приложении — проставляет deletedAt и отправляет изменение
// на мастер-сервер, чтобы удаление разошлось на все планшеты и другую
// сторону (плата/сервер), а не только точечно стёрло строку в одной базе.
//
// Флаги:
//   --dry-run    Показать, что будет удалено, ничего не менять
//   --no-backup  Пропустить автоматический бэкап (не делай так без причины)

import "../nedb-compat.js";
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import Datastore from "nedb";
import { pushLocalChangeToRemote } from "../push-remote.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_BACKUP = args.includes("--no-backup");

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

async function main() {
  const db = new Datastore(path.join(SERVER_DIR, "database.db"));
  await new Promise((resolve, reject) => db.loadDatabase((err) => (err ? reject(err) : resolve())));

  const songs = await new Promise((resolve, reject) =>
    db.find({ docType: "song" }, (err, docs) => (err ? reject(err) : resolve(docs))),
  );
  const live = songs.filter((d) => !d.deletedAt);

  const byName = new Map();
  for (const d of live) {
    const k = norm(d.name);
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(d);
  }

  const targets = [];
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const withFile = group.filter((d) => d.file?.filename);
    const withoutFile = group.filter((d) => !d.file?.filename);
    if (withFile.length === 0 || withoutFile.length === 0) continue;
    targets.push(...withoutFile);
  }

  console.log(`[purge-fileless] Живых партитур: ${live.length}`);
  console.log(`[purge-fileless] Дубликатов без файла к удалению: ${targets.length}\n`);

  if (targets.length === 0) {
    console.log("[purge-fileless] Ничего не нашлось.");
    return;
  }

  for (const d of targets) {
    console.log(`  «${d.name}» (раздел: ${d.category ?? "—"}, id: ${d._id}) — файла нет`);
  }

  if (DRY_RUN) {
    console.log("\n[purge-fileless] DRY RUN — ничего не менялось.");
    return;
  }

  if (!SKIP_BACKUP) {
    console.log("\n[purge-fileless] Делаю резервную копию перед началом...");
    execFileSync("bash", [path.join(__dirname, "backup.sh"), "before-purge-fileless-duplicates"], {
      stdio: "inherit",
    });
  }

  let done = 0;
  for (const d of targets) {
    const deletedAt = Date.now();
    const updatedAt = deletedAt;
    await new Promise((resolve) => {
      db.update({ _id: d._id }, { $set: { deletedAt, updatedAt } }, {}, (err) => {
        if (err) console.warn(`[purge-fileless]   ${d.name}: не удалось удалить — ${err.message}`);
        resolve();
      });
    });
    await pushLocalChangeToRemote({ ...d, deletedAt, updatedAt }).catch((e) =>
      console.warn(`[purge-fileless]   ${d.name}: не удалось отправить на мастер: ${e.message}`),
    );
    done++;
  }

  db.persistence.compactDatafile();

  console.log(`\n[purge-fileless] Готово: удалено ${done} из ${targets.length}.`);
}

main().catch((e) => {
  console.error("[purge-fileless] Сорвалось:", e);
  process.exit(1);
});
