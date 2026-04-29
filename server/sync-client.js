// Сервис синхронизации для ЛОКАЛЬНОГО сервера.
// Запускается только когда IS_LOCAL_SERVER=true в .env.local.
// Каждые 5 минут тянет изменения с интернет-сервера через /api/sync/export.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { database } from "./index.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INTERNET_URL = process.env.SYNC_MASTER_URL; // https://songs.nevsky-sobor.ru
const SYNC_API_KEY = process.env.SYNC_API_KEY;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 минут
const STATE_FILE = path.join(__dirname, "sync-state.json");

function getLastSyncTimestamp() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")).timestamp || 0;
  } catch {
    return 0;
  }
}

function saveLastSyncTimestamp(ts) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ timestamp: ts }), "utf8");
}

async function downloadFile(filename) {
  const dest = path.join(__dirname, "uploads", filename);
  if (fs.existsSync(dest)) return;

  try {
    const res = await fetch(
      `${INTERNET_URL}/uploads/${encodeURIComponent(filename)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    console.log(`[sync] Скачан файл: ${filename}`);
  } catch (e) {
    console.warn(`[sync] Не удалось скачать файл ${filename}:`, e.message);
  }
}

function dbUpdate(query, update) {
  return new Promise((resolve) =>
    database.update(query, update, { upsert: true }, resolve),
  );
}

function dbFind(query) {
  return new Promise((resolve) =>
    database.find(query, (err, docs) => resolve(err ? [] : docs)),
  );
}

function dbRemove(query) {
  return new Promise((resolve) =>
    database.remove(query, { multi: true }, resolve),
  );
}

function dbFindOne(query) {
  return new Promise((resolve) =>
    database.findOne(query, (err, doc) => resolve(err ? null : doc)),
  );
}

function deleteLocalFile(filename) {
  if (!filename) return;
  const filePath = path.join(__dirname, "uploads", filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[sync] Удалён файл: ${filename}`);
    }
  } catch (e) {
    console.warn(`[sync] Не удалось удалить файл ${filename}:`, e.message);
  }
}

// ---------------------------------------------------------------------
// Сценарий A: Local wins — запись есть на локальном, нет на мастере
// Пушим её на мастер вместе с файлом (если есть).
// ---------------------------------------------------------------------

async function pushSongToRemote(doc) {
  const form = new FormData();
  // Передаём полный документ как JSON-строку
  form.append("doc", JSON.stringify(doc));

  // Прикладываем PDF, если файл существует локально
  const filename = doc.file?.filename;
  if (filename) {
    const filePath = path.join(__dirname, "uploads", filename);
    if (fs.existsSync(filePath)) {
      const blob = new Blob([fs.readFileSync(filePath)], {
        type: doc.file.mimetype || "application/pdf",
      });
      form.append("file", blob, filename);
    }
  }

  const res = await fetch(`${INTERNET_URL}/api/sync/push-song`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SYNC_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(60_000), // увеличенный timeout для загрузки файла
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  console.log(`[sync/reconcile] Песня запушена на мастер: ${doc._id}`);
}

async function pushStackToRemote(doc) {
  const res = await fetch(`${INTERNET_URL}/api/sync/push-stack`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SYNC_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(doc),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  console.log(`[sync/reconcile] Стопка запушена на мастер: ${doc._id}`);
}

// Полная сверка: находит локальные записи, которых нет на мастере, и пушит их.
// Запускается раз в сутки — закрывает случаи hard-delete на мастере
// и записей, созданных напрямую на локальном сервере.
export async function fullReconciliation() {
  if (!INTERNET_URL || !SYNC_API_KEY) return;

  console.log("[sync/reconcile] Запуск полной сверки с мастером...");

  let remoteIds;
  try {
    const res = await fetch(`${INTERNET_URL}/api/sync/ids`, {
      headers: { Authorization: `Bearer ${SYNC_API_KEY}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    remoteIds = await res.json();
  } catch (e) {
    console.error("[sync/reconcile] Не удалось получить ID с мастера:", e.message);
    return;
  }

  const remoteSongSet  = new Set(remoteIds.songIds);
  const remoteStackSet = new Set(remoteIds.stackIds);

  // --- Songs ---
  const localSongs = await dbFind({ docType: "song", deletedAt: { $exists: false } });
  let pushedSongs = 0;
  for (const doc of localSongs) {
    if (!remoteSongSet.has(doc._id)) {
      try {
        await pushSongToRemote(doc);
        pushedSongs++;
      } catch (e) {
        console.warn(`[sync/reconcile] Не удалось запушить песню ${doc._id}:`, e.message);
      }
    }
  }

  // --- Stacks ---
  const localStacks = await dbFind({ docType: "stack", deletedAt: { $exists: false } });
  let pushedStacks = 0;
  for (const doc of localStacks) {
    if (!remoteStackSet.has(doc._id)) {
      try {
        await pushStackToRemote(doc);
        pushedStacks++;
      } catch (e) {
        console.warn(`[sync/reconcile] Не удалось запушить стопку ${doc._id}:`, e.message);
      }
    }
  }

  console.log(
    `[sync/reconcile] Готово: запушено ${pushedSongs} песен, ${pushedStacks} стопок`,
  );
}

// ---------------------------------------------------------------------

export async function syncFromInternet() {
  console.log(
    "[sync] Проверяю обновления на интернет-сервере...",
    INTERNET_URL,
    SYNC_API_KEY,
  );
  if (!INTERNET_URL || !SYNC_API_KEY) {
    console.warn(
      "[sync] SYNC_MASTER_URL или SYNC_API_KEY не заданы, пропускаю",
    );
    return;
  }

  const since = getLastSyncTimestamp();
  console.log(
    `[sync] Старт синхронизации (since: ${new Date(since).toISOString()})`,
  );

  let data;
  try {
    const res = await fetch(`${INTERNET_URL}/api/sync/export?since=${since}`, {
      headers: { Authorization: `Bearer ${SYNC_API_KEY}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    console.error("[sync] Не удалось получить данные с мастера:", e.message);
    return;
  }

  const {
    timestamp,
    songs = [],
    stacks = [],
    deletedSongIds = [],
    deletedStackIds = [],
  } = data;

  // Upsert songs
  for (const song of songs) {
    await dbUpdate({ _id: song._id }, song);
    if (song.file?.filename) await downloadFile(song.file.filename);
  }

  // Upsert stacks
  for (const stack of stacks) {
    await dbUpdate({ _id: stack._id }, stack);
  }

  // Физически удаляем soft-deleted записи у реплики вместе с файлами
  if (deletedSongIds.length) {
    // Сначала достаём записи из локальной БД, чтобы знать имена файлов
    const docsToDelete = await dbFind({ _id: { $in: deletedSongIds } });
    for (const doc of docsToDelete) {
      deleteLocalFile(doc.file?.filename);
    }
    await dbRemove({ _id: { $in: deletedSongIds } });
  }
  if (deletedStackIds.length) {
    await dbRemove({ _id: { $in: deletedStackIds } });
  }

  saveLastSyncTimestamp(timestamp);
  console.log(
    `[sync] Готово: +${songs.length} песен, +${stacks.length} стопок,` +
      ` удалено: ${deletedSongIds.length + deletedStackIds.length}`,
  );
}

export function startSyncScheduler() {
  if (!process.env.IS_LOCAL_SERVER) return;

  console.log("[sync] Локальный сервер: запускаю планировщик синхронизации");
  // Первый запуск — после небольшой задержки, чтобы БД успела подняться
  setTimeout(() => {
    syncFromInternet();
    setInterval(syncFromInternet, SYNC_INTERVAL_MS);

    // Полная сверка (Local wins) — раз в сутки
    // Первый прогон через 1 мин после старта, далее каждые 24 часа
    setTimeout(() => {
      fullReconciliation();
      setInterval(fullReconciliation, 24 * 60 * 60 * 1000);
    }, 60_000);
  }, 3000);
}
