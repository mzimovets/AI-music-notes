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

/**
 * Бюджет считается от памяти устройства: на телефоне картинки страниц — самый
 * тяжёлый объект в приложении, и фиксированные сто мегабайт роняли вкладку.
 */
const MEMORY_BUDGET = (() => {
  const gb =
    typeof navigator !== "undefined" && (navigator as any).deviceMemory
      ? (navigator as any).deviceMemory
      : 4;
  return Math.max(24, Math.min(64, gb * 6)) * 1024 * 1024;
})();

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

/**
 * Очередь отрисовки.
 *
 * pdf.js растеризует на главном потоке, и страница нот занимает его на сотни
 * миллисекунд. Без очереди предзагрузка соседних страниц запускалась пачкой
 * сразу после касания и кнопки переставали нажиматься. Здесь всё, что нужно
 * показать сейчас, идёт вперёд, а предзагрузка ждёт и уступает между задачами.
 */
type Task = {
  run: () => Promise<unknown>;
  /** Завершает обещание задачи, если до неё так и не дошли */
  cancel: () => void;
  urgent: boolean;
  gen: number;
};

const queue: Task[] = [];
let pumping = false;
/** Поколение предзагрузки: листнули — всё запланированное ранее уже не нужно */
let prefetchGen = 0;

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

async function pump() {
  if (pumping) return;
  pumping = true;

  while (queue.length > 0) {
    const urgentAt = queue.findIndex((t) => t.urgent);
    const task = queue.splice(urgentAt >= 0 ? urgentAt : 0, 1)[0];

    // Предзагрузка, заказанная до листания, уже неактуальна. Завершить её
    // обещание обязательно: иначе оно навсегда остаётся в списке «уже
    // рисуется», и следующий запрос этой же страницы ждёт его вечно
    if (!task.urgent && task.gen !== prefetchGen) {
      task.cancel();
      continue;
    }

    try {
      await task.run();
    } catch {}

    // Отдаём кадр браузеру — иначе касания ждут конца всей очереди
    await yieldToBrowser();
  }

  pumping = false;
}

function schedule<T>(
  run: () => Promise<T>,
  urgent: boolean,
): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    queue.push({
      urgent,
      gen: prefetchGen,
      run: () => run().then(resolve, reject),
      cancel: () => resolve(null),
    });
    pump();
  });
}

/** Отменяет предзагрузку, заказанную раньше: пользователь ушёл на другие страницы. */
export function cancelPendingPrefetch() {
  prefetchGen += 1;
}

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
function ensureRendered(
  doc: PdfDocument,
  docKey: string,
  pageNum: number,
  bucketed: number,
  urgent: boolean,
): ImageBitmap | Promise<ImageBitmap | null> {
  const key = keyOf(docKey, pageNum, bucketed);

  const hit = cache.get(key);
  if (hit) {
    touch(key, hit);
    return hit.bitmap;
  }

  // Уже рисуется — ждём ту же отрисовку, второй раз не запускаем
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = schedule(() => render(doc, docKey, pageNum, bucketed), urgent)
    .catch((err: any) => {
      if (err?.name !== "RenderingCancelledException") {
        console.error("[pdf-page-cache] render failed:", err);
      }
      return null;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);

  // Страховка от зависшей записи: если отрисовка почему-то не завершится,
  // страница не должна остаться в загрузке навсегда — освобождаем ключ,
  // чтобы следующий заход попробовал заново
  setTimeout(() => {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  }, 15_000);

  return promise;
}

export function getRenderedPage(
  doc: PdfDocument,
  docKey: string,
  pageNum: number,
  width: number,
): ImageBitmap | Promise<ImageBitmap | null> {
  return ensureRendered(doc, docKey, pageNum, bucketWidth(width), true);
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
        // Низкий приоритет: пропустит вперёд всё, что нужно показать сейчас
        ensureRendered(doc, docKey, pageNum, bucketed, false);
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
