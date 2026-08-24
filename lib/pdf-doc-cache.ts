"use client";

/**
 * Общий кэш pdf.js-документов.
 *
 * До него каждая PdfPageCard открывала документ самостоятельно: песня на три
 * страницы разбиралась три раза, а стопка из пятнадцати песен давала около
 * сорока пяти параллельных разборов — отсюда фризы при прокрутке и при
 * переключении режимов. Теперь один файл открывается один раз, а все
 * компоненты берут готовый документ отсюда.
 */

type PdfDocument = any;

const docs = new Map<string, Promise<PdfDocument>>();

let pdfjsLibPromise: Promise<any> | null = null;

function loadPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      // Полифилл для Safari iOS — Map.getOrInsertComputed появился позже pdfjs 5.x
      if (!("getOrInsertComputed" in Map.prototype)) {
        (Map.prototype as any).getOrInsertComputed = function (
          key: any,
          fn: (k: any) => any,
        ) {
          if (!this.has(key)) this.set(key, fn(key));
          return this.get(key);
        };
      }

      const pdfjsLib = await import("pdfjs-dist/build/pdf");
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = "/api/pdf-worker";
      return pdfjsLib;
    })();
  }
  return pdfjsLibPromise;
}

/**
 * Открывает документ по URL. Повторные вызовы с тем же URL возвращают тот же
 * объект — включая случай, когда загрузка ещё идёт.
 */
/**
 * Достаёт ноту из памяти устройства, не касаясь сети.
 *
 * Сервис-воркер и сам отдаёт ноты по правилу «сначала кеш», но полагаться
 * только на него нельзя: сразу после его обновления страница какое-то время
 * остаётся без него, и тогда запрос уходит в сеть. Без связи он висит, пока
 * не сдастся система, занимая одно из немногих соединений — и следующие
 * запросы даже не начинаются. Со стороны это выглядит как застывшее
 * приложение, которое «через какое-то время очухалось».
 *
 * Своя проверка снимает эту зависимость целиком: то, что скачано, открывается
 * мгновенно при любом состоянии сети и при любом состоянии воркера.
 */
async function readFromCache(url: string): Promise<ArrayBuffer | null> {
  if (typeof caches === "undefined") return null;
  try {
    const hit = await caches.match(url, { ignoreSearch: true, ignoreVary: true });
    return hit ? await hit.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export function getPdfDocument(url: string): Promise<PdfDocument> {
  const cached = docs.get(url);
  if (cached) return cached;

  const promise = (async () => {
    const pdfjsLib = await loadPdfjsLib();

    // Файл забираем обычным запросом, а не отдаём URL в pdf.js. Тот качает
    // документ диапазонами, а service worker хранит целые ответы и такие
    // запросы обслужить не может — без интернета ноты не открывались вовсе.
    // Сначала своя память, и только потом сеть. Скачанная нота открывается
    // мгновенно при любом состоянии связи — ради этого всё и делалось
    let data = await readFromCache(url);

    if (!data) {
      // Ноты нет на устройстве — приходится идти в сеть. Срок короткий:
      // без связи ждать бессмысленно, а человеку важнее быстро понять, что
      // лист не скачан, чем смотреть в пустой экран полминуты
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`Не удалось загрузить ${url}: ${res.status}`);
      data = await res.arrayBuffer();
    }

    return (pdfjsLib as any).getDocument({
      data,
      isEvalSupported: false,
      wasmUrl: "/api/pdf-wasm/",
    }).promise;
  })();

  // Неудачную загрузку не кэшируем, иначе временная ошибка сети запомнится навсегда
  promise.catch(() => {
    if (docs.get(url) === promise) docs.delete(url);
  });

  docs.set(url, promise);
  return promise;
}

/**
 * Открывает документ из уже загруженных байтов (выбранный файл, склеенная
 * программа). Ключ задаётся вызывающей стороной, потому что у байтов нет URL.
 */
export function getPdfDocumentFromData(
  key: string,
  data: ArrayBuffer,
): Promise<PdfDocument> {
  const cached = docs.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const pdfjsLib = await loadPdfjsLib();
    // slice() — pdf.js передаёт буфер в воркер через transfer и обнуляет оригинал
    return (pdfjsLib as any).getDocument({
      data: data.slice(0),
      isEvalSupported: false,
      wasmUrl: "/api/pdf-wasm/",
    }).promise;
  })();

  promise.catch(() => {
    if (docs.get(key) === promise) docs.delete(key);
  });

  docs.set(key, promise);
  return promise;
}

/** Убирает документ из кэша — например, когда файл заменили. */
export function evictPdfDocument(key: string) {
  const entry = docs.get(key);
  if (!entry) return;
  docs.delete(key);
  entry.then((doc) => doc?.destroy?.()).catch(() => {});
}
