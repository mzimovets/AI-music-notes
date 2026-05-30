// push-remote.js — push локальных изменений на мастер + outbox.
// Не импортирует database, поэтому не создаёт циклической зависимости
// с index.js → routes/songs.js → sync-client.js → index.js.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INTERNET_URL = process.env.SYNC_MASTER_URL;
const SYNC_API_KEY = process.env.SYNC_API_KEY;
const OUTBOX_FILE = path.join(__dirname, "push-outbox.json");

// ---------------------------------------------------------------------
// Push-функции
// ---------------------------------------------------------------------

export async function pushSongToRemote(doc) {
  const form = new FormData();
  form.append("doc", JSON.stringify(doc));

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
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  console.log(`[sync/push] Песня запушена на мастер: ${doc._id}`);
}

export async function pushFileToRemote(filename, mimetype) {
  const filePath = path.join(__dirname, "uploads", filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[sync/push] Файл не найден локально, пропускаю: ${filename}`);
    return;
  }

  const form = new FormData();
  const blob = new Blob([fs.readFileSync(filePath)], {
    type: mimetype || "application/pdf",
  });
  form.append("file", blob, filename);
  form.append("filename", filename);

  const res = await fetch(`${INTERNET_URL}/api/sync/push-file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SYNC_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  console.log(`[sync/push] Файл восстановлен на мастере: ${filename}`);
}

export async function pushStackToRemote(doc) {
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
  console.log(`[sync/push] Стопка запушена на мастер: ${doc._id}`);
}

// ---------------------------------------------------------------------
// Outbox — очередь при отсутствии интернета
// ---------------------------------------------------------------------

function loadOutbox() {
  try { return JSON.parse(fs.readFileSync(OUTBOX_FILE, "utf8")); } catch { return []; }
}

function saveOutbox(entries) {
  try { fs.writeFileSync(OUTBOX_FILE, JSON.stringify(entries), "utf8"); } catch {}
}

function addToOutbox(doc) {
  const entries = loadOutbox();
  const idx = entries.findIndex((e) => e._id === doc._id);
  if (idx !== -1) entries[idx] = doc;
  else entries.push(doc);
  saveOutbox(entries);
  console.log(`[sync/outbox] Сохранено в очередь: ${doc._id} (${doc.docType})`);
}

function removeFromOutbox(id) {
  saveOutbox(loadOutbox().filter((e) => e._id !== id));
}

export async function flushOutbox() {
  const entries = loadOutbox();
  if (!entries.length) return;

  console.log(`[sync/outbox] Отправляю ${entries.length} отложенных изменений на мастер...`);
  for (const doc of entries) {
    try {
      if (doc.docType === "song") await pushSongToRemote(doc);
      else if (doc.docType === "stack") await pushStackToRemote(doc);
      removeFromOutbox(doc._id);
      console.log(`[sync/outbox] Отправлено: ${doc._id}`);
    } catch (e) {
      console.warn(`[sync/outbox] Не удалось отправить ${doc._id}:`, e.message);
    }
  }
}

/**
 * Мгновенный push локального изменения на мастер.
 * Если нет интернета — сохраняет в outbox, отправит при следующей синхронизации (≤5 мин).
 */
export async function pushLocalChangeToRemote(doc) {
  if (!INTERNET_URL || !SYNC_API_KEY) return;
  try {
    if (doc.docType === "song") await pushSongToRemote(doc);
    else if (doc.docType === "stack") await pushStackToRemote(doc);
    removeFromOutbox(doc._id);
  } catch (e) {
    console.warn("[sync/push] Нет связи с мастером, добавляю в очередь:", e.message);
    addToOutbox(doc);
  }
}
