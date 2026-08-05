"use client";

/**
 * Кэш отрисованных страниц.
 *
 * Отрисовка страницы нот через pdf.js — это сотни миллисекунд на телефоне,
 * и раньше она повторялась при каждом перелистывании, при возврате назад и при
 * переключении режима просмотра. Здесь готовые страницы хранятся картинками,
 * поэтому повторный показ — это один drawImage.
 *
 * Ограничение по памяти, а не по количеству: страница на телефоне весит около
 * 3 МБ, на большом экране — все 15, и одна и та же граница по числу страниц
 * вела бы себя совершенно по-разному.
 */

type PdfDocument = any;

const MEMORY_BUDGET = 96 * 1024 * 1024;

/** Ширина округляется вверх — иначе любое дрожание вёрстки промахивается мимо кэша. */
const WIDTH_STEP = 64;

type Entry = {
  bitmap: ImageBitmap;
  bytes: number;
};

// Map сохраняет порядок вставки — переиспользуем его как список давности
const cache = new Map<string, Entry>();
const inFlight = new Map<string, Promise<ImageBitmap | null>>();
let usedBytes = 0;

const keyOf = (docKey: string, pageNum: number, width: number) =>
  `${docKey}|${pageNum}|${width}`;

export const bucketWidth = (width: number) =>
  Math.max(WIDTH_STEP, Math.ceil(width / WIDTH_STEP) * WIDTH_STEP);

function touch(key: string, entry: Entry) {
  cache.delete(key);
  cache.set(key, entry);
}

function evictUntilFits() {
  for (const [key, entry] of Array.from(cache.entries())) {
    if (usedBytes <= MEMORY_BUDGET) break;
    cache.delete(key);
    usedBytes -= entry.bytes;
    entry.bitmap.close();
  }
}

async function render(
  doc: PdfDocument,
  docKey: string,
  pageNum: number,
  bucketedWidth: number,
): Promise<ImageBitmap | null> {
  const page = await doc.getPage(pageNum);
  const rotation = page.rotate || 0;
  const base = page.getViewport({ scale: 1, rotation });

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = (bucketedWidth / base.width) * dpr;
  const viewport = page.getViewport({ scale, rotation });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  await page.render({ canvasContext: ctx, viewport }).promise;

  const bitmap = await createImageBitmap(canvas);
  const bytes = canvas.width * canvas.height * 4;

  const key = keyOf(docKey, pageNum, bucketedWidth);
  cache.set(key, { bitmap, bytes });
  usedBytes += bytes;
  evictUntilFits();

  return bitmap;
}

/**
 * Отдаёт готовую картинку страницы. Если её уже рисуют — дожидается той же
 * отрисовки, а не запускает вторую.
 */
export function getRenderedPage(
  doc: PdfDocument,
  docKey: string,
  pageNum: number,
  width: number,
): ImageBitmap | Promise<ImageBitmap | null> {
  const bucketed = bucketWidth(width);
  const key = keyOf(docKey, pageNum, bucketed);

  const hit = cache.get(key);
  if (hit) {
    touch(key, hit);
    return hit.bitmap;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = render(doc, docKey, pageNum, bucketed)
    .catch((err) => {
      if (err?.name !== "RenderingCancelledException") {
        console.error("[pdf-page-cache] render failed:", err);
      }
      return null;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Синхронная проверка — чтобы нарисовать без единого кадра пустоты. */
export function peekRenderedPage(
  docKey: string,
  pageNum: number,
  width: number,
): ImageBitmap | null {
  const key = keyOf(docKey, pageNum, bucketWidth(width));
  const hit = cache.get(key);
  if (!hit) return null;
  touch(key, hit);
  return hit.bitmap;
}

const idle = (fn: () => void) =>
  typeof requestIdleCallback === "function"
    ? requestIdleCallback(fn, { timeout: 2000 })
    : setTimeout(fn, 200);

/**
 * Готовит соседние страницы в простое, чтобы листание было мгновенным.
 *
 * Ширину считает вызывающая сторона через resolveWidth: книжный режим исходит
 * из высоты разворота, прокрутка — из ширины колонки. Если бы ширина приходила
 * числом, предзагрузка рисовала бы страницу в другой размер, и показ всё равно
 * начинался бы с нуля.
 */
export function prefetchPages(
  doc: PdfDocument,
  docKey: string,
  pageNums: number[],
  resolveWidth: (page: any) => number,
) {
  if (!doc) return;

  for (const pageNum of pageNums) {
    if (pageNum < 1 || pageNum > doc.numPages) continue;

    idle(async () => {
      try {
        const page = await doc.getPage(pageNum);
        const bucketed = bucketWidth(resolveWidth(page));
        const key = keyOf(docKey, pageNum, bucketed);
        if (cache.has(key) || inFlight.has(key)) return;
        getRenderedPage(doc, docKey, pageNum, bucketed);
      } catch {}
    });
  }
}

/** Выбрасывает страницы документа — например, когда файл заменили. */
export function evictDocumentPages(docKey: string) {
  for (const [key, entry] of Array.from(cache.entries())) {
    if (!key.startsWith(`${docKey}|`)) continue;
    cache.delete(key);
    usedBytes -= entry.bytes;
    entry.bitmap.close();
  }
}
