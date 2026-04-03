/**
 * Offline Sync — выполняет накопленные операции когда сеть восстановилась.
 */

import { getQueue, dequeue, getFile, removeFile, type OfflineOp } from "./offline-queue";
import { getBackendBaseUrl } from "./client-url";

async function execOp(op: OfflineOp): Promise<boolean> {
  const backUrl = getBackendBaseUrl();

  try {
    switch (op.type) {
      // ── Создать песню ──────────────────────────────────────────────
      case "song.create": {
        const file = await getFile(op.fileDbKey);
        if (!file) {
          console.warn("[Sync] Файл не найден в IndexedDB:", op.fileDbKey);
          return false;
        }
        const fd = new FormData();
        fd.append("name", op.name);
        fd.append("author", op.author);
        fd.append("authorLyrics", op.authorLyrics);
        fd.append("authorArrange", op.authorArrange);
        fd.append("category", op.category);
        fd.append("docType", "song");
        fd.append("file", file, op.filename);

        const res = await fetch(`${backUrl}/song/${op.tempId}`, {
          method: "POST",
          body: fd,
        });
        if (res.ok) {
          await removeFile(op.fileDbKey);
          return true;
        }
        return false;
      }

      // ── Редактировать песню ─────────────────────────────────────────
      case "song.edit": {
        const fd = new FormData();
        fd.append("name", op.name);
        fd.append("author", op.author);
        fd.append("authorLyrics", op.authorLyrics);
        fd.append("authorArrange", op.authorArrange);
        fd.append("category", op.category);
        fd.append("docType", op.docType);

        if (op.fileDbKey) {
          const file = await getFile(op.fileDbKey);
          if (file) fd.append("file", file, op.filename);
        }

        const res = await fetch(`${backUrl}/song/${op.id}/true`, {
          method: "POST",
          body: fd,
        });
        if (res.ok && op.fileDbKey) await removeFile(op.fileDbKey);
        return res.ok;
      }

      // ── Удалить песню ───────────────────────────────────────────────
      case "song.delete": {
        const res = await fetch(`${backUrl}/song/${op.id}/true`);
        return res.ok;
      }

      // ── Создать стопку ──────────────────────────────────────────────
      case "stack.create": {
        const res = await fetch(`${backUrl}/stack/${op.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: op.name, _id: op.id, docType: "stack" }),
        });
        return res.ok;
      }

      // ── Сохранить стопку ────────────────────────────────────────────
      case "stack.update": {
        const body: Record<string, unknown> = {
          songs: op.songs,
          isPublished: op.isPublished,
          mealType: op.mealType,
          programSelected: op.programSelected,
          name: op.name,
          _id: op.id,
          docType: "stack",
        };
        if (op.cover) body.cover = op.cover;

        const res = await fetch(`${backUrl}/stack/${op.id}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return res.ok;
      }

      // ── Удалить стопку ──────────────────────────────────────────────
      case "stack.delete": {
        const res = await fetch(`${backUrl}/stack/${op.id}/true`);
        return res.ok;
      }
    }
  } catch (e) {
    console.error(`[Sync] Ошибка при выполнении ${op.type}:`, e);
    return false;
  }
}

export async function processOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  console.log(`[Sync] Обрабатываем ${queue.length} офлайн-операций...`);

  let synced = 0;
  let failed = 0;

  for (const entry of queue) {
    const ok = await execOp(entry.op);
    if (ok) {
      dequeue(entry.queueId);
      synced++;
      console.log(`[Sync] ✓ ${entry.op.type}`);
    } else {
      failed++;
      console.warn(`[Sync] ✗ ${entry.op.type}`);
    }
  }

  console.log(`[Sync] Готово: синхронизировано ${synced}, ошибок ${failed}`);
  return { synced, failed };
}
