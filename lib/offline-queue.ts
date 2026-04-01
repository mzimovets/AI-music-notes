/**
 * Offline Queue — хранит операции когда нет сети и синхронизирует при восстановлении.
 * Метаданные операций: localStorage
 * Файлы (PDF): IndexedDB
 */

import type { StackSong } from "./types";

const QUEUE_KEY = "offline-op-queue-v1";
const IDB_NAME = "offline-files-db";
const IDB_STORE = "files";

// ─────────────────────────────────────────────
// Типы операций
// ─────────────────────────────────────────────

export type OfflineOp =
  | {
      type: "song.create";
      tempId: string;
      name: string;
      author: string;
      authorLyrics: string;
      authorArrange: string;
      category: string;
      fileDbKey: string;
      filename: string;
    }
  | {
      type: "song.edit";
      id: string;
      name: string;
      author: string;
      authorLyrics: string;
      authorArrange: string;
      category: string;
      docType: string;
      fileDbKey?: string;
      filename?: string;
    }
  | { type: "song.delete"; id: string }
  | { type: "stack.create"; id: string; name: string }
  | {
      type: "stack.update";
      id: string;
      songs: StackSong[];
      isPublished: boolean;
      mealType: string | null;
      programSelected: string[];
      name: string;
      cover: string;
    }
  | { type: "stack.delete"; id: string };

export interface QueueEntry {
  queueId: string;
  timestamp: number;
  op: OfflineOp;
}

// ─────────────────────────────────────────────
// Управление очередью (localStorage)
// ─────────────────────────────────────────────

export function getQueue(): QueueEntry[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function enqueue(op: OfflineOp): string {
  const entry: QueueEntry = {
    queueId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    op,
  };
  const queue = getQueue();
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log(`[Queue] ➕ ${op.type}`, entry.queueId);
  window.dispatchEvent(new CustomEvent("offline-queue-changed"));
  return entry.queueId;
}

export function dequeue(queueId: string) {
  const queue = getQueue().filter((e) => e.queueId !== queueId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent("offline-queue-changed"));
}

// ─────────────────────────────────────────────
// IndexedDB — хранение File объектов (PDF)
// ─────────────────────────────────────────────

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeFile(file: File): Promise<string> {
  const db = await openIdb();
  const key = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const req = tx.objectStore(IDB_STORE).put(file, key);
    req.onsuccess = () => resolve(key);
    req.onerror = () => reject(req.error);
  });
}

export async function getFile(key: string): Promise<File | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function removeFile(key: string) {
  const db = await openIdb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const req = tx.objectStore(IDB_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
