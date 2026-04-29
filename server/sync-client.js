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

function dbRemove(query) {
  return new Promise((resolve) =>
    database.remove(query, { multi: true }, resolve),
  );
}

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

  // Физически удаляем soft-deleted записи у реплики
  if (deletedSongIds.length) {
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
  }, 3000);
}
