"use client";
import { useEffect, useRef, useState } from "react";

import { useSession } from "next-auth/react";
import { addToast } from "@heroui/react";
import { processOfflineQueue } from "@/lib/offline-sync";
import { getQueue } from "@/lib/offline-queue";
import { getBackendBaseUrl, getUploadPath } from "@/lib/client-url";
import { fetchCategories, getCategories } from "@/lib/categories-store";
import { socket } from "@/lib/socket";
import { useLocalServer } from "@/hooks/useLocalServer";
import { SPLASH_FORCE_KEY } from "@/components/SplashScreen";

const CACHE_STATE_KEY = "sw-cached-state-v5";

/** Проверяем доступность бэкенда напрямую (не navigator.onLine —
 *  тот возвращает false на мобильных даже при подключении к RPi-хотспоту) */
async function canReachBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/ping`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface Progress {
  current: number;
  total: number;
  done: boolean;
  /**
   * Service worker скачивает свой набор файлов (193 штуки) до того, как
   * передаст управление нашему коду, и всё это время полосы не было видно
   * вовсе — со стороны выглядело, будто кэширование не начинается минутами.
   * На этой стадии считать проценты нечего, показываем только подпись.
   */
  preparing?: boolean;
}

interface SongEntry {
  id: string;
  filename: string | null;
}

interface CachedState {
  songs: SongEntry[];
  stacks: string[];
  /** Ключи категорий — регент может их добавлять и удалять */
  categories?: string[];
}

function loadCachedState(): CachedState {
  try {
    const raw = localStorage.getItem(CACHE_STATE_KEY);
    return raw ? JSON.parse(raw) : { songs: [], stacks: [], categories: [] };
  } catch {
    return { songs: [], stacks: [], categories: [] };
  }
}

function saveCachedState(state: CachedState) {
  try {
    localStorage.setItem(CACHE_STATE_KEY, JSON.stringify(state));
  } catch {}
}

/** Удаляем из всех SW-кэшей URL совпадающие по pathname */
async function deleteFromAllCaches(urlPath: string) {
  if (!("caches" in window)) return;
  const names = await caches.keys();
  for (const name of names) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    for (const req of keys) {
      try {
        const u = new URL(req.url);
        if (u.pathname === urlPath || u.pathname.startsWith(urlPath + "/")) {
          await cache.delete(req);
        }
      } catch {}
    }
  }
}

async function fetchAndCache(url: string, cacheName: string) {
  try {
    const res = await fetch(url, { credentials: "same-origin", cache: "reload" });
    if (res.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(url, res);
      return true;
    }
  } catch {}
  return false;
}

/** Ждём пока SW станет активным и возьмёт контроль над страницей */
async function waitForSWController(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  await navigator.serviceWorker.ready;
  if (navigator.serviceWorker.controller) return true;

  return new Promise<boolean>((resolve) => {
    const onControllerChange = () => resolve(true);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange, { once: true });
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      resolve(!!navigator.serviceWorker.controller);
    }, 5000);
  });
}

async function syncCache(onProgress: (p: Progress) => void) {
  const backUrl = getBackendBaseUrl();
  const prev = loadCachedState();
  const prevSongIds = new Set(prev.songs.map((s) => s.id));
  const prevStackIds = new Set(prev.stacks);
  const isFirstSync = prev.songs.length === 0 && prev.stacks.length === 0;

  // Получаем актуальные данные из бэкенда
  let currentSongs: SongEntry[] = [];
  let currentStacks: string[] = [];

  try {
    const res = await fetch(`${backUrl}/songs`, { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      const docs: { _id: string; file?: { filename?: string } }[] =
        data?.docs ?? (Array.isArray(data) ? data : []);
      currentSongs = docs
        .filter((d) => d._id)
        .map((d) => ({ id: d._id, filename: d.file?.filename ?? null }));
    }
  } catch (e) {
    console.warn("[Sync] Не удалось получить список песен:", e);
  }

  try {
    const res = await fetch(`${backUrl}/stacks`, { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      const docs: { _id: string }[] = data?.docs ?? (Array.isArray(data) ? data : []);
      currentStacks = docs.map((d) => d._id).filter(Boolean);
    }
  } catch (e) {
    console.warn("[Sync] Не удалось получить список стопок:", e);
  }

  const currentSongIds = new Set(currentSongs.map((s) => s.id));
  const currentStackIds = new Set(currentStacks);

  // Удаляем из кэша то, что удалено из БД
  for (const { id, filename } of prev.songs) {
    if (!currentSongIds.has(id)) {
      console.log(`[Sync] Удаляем /song/${id}`);
      await deleteFromAllCaches(`/song/${id}`);
      if (filename) await deleteFromAllCaches(getUploadPath(filename));
    }
  }
  for (const id of prev.stacks) {
    if (!currentStackIds.has(id)) {
      console.log(`[Sync] Удаляем /stack/${id}`);
      await deleteFromAllCaches(`/stack/${id}`);
      await deleteFromAllCaches(`/stackView/${id}`);
    }
  }

  // Подтягиваем свежий список, иначе только что добавленная категория
  // не попадёт в офлайн-кэш до следующей синхронизации
  await fetchCategories();
  const currentCategories = getCategories();
  const currentCategoryKeys = new Set(currentCategories.map((c) => c.key));
  for (const key of prev.categories ?? []) {
    if (!currentCategoryKeys.has(key)) {
      console.log(`[Sync] Удаляем /playlist/${key}`);
      await deleteFromAllCaches(`/playlist/${key}`);
    }
  }

  // Определяем что нужно закэшировать
  const newSongs = currentSongs.filter((s) => !prevSongIds.has(s.id));
  const newStacks = currentStacks.filter((id) => !prevStackIds.has(id));
  const prevCategoryKeys = new Set(prev.categories ?? []);
  const newCategories = currentCategories.filter((c) => !prevCategoryKeys.has(c.key));

  const pageUrls: string[] = [];
  const assetUrls: string[] = [];

  if (isFirstSync) {
    // Первый запуск: кэшируем всё
    pageUrls.push("/api/auth/session", "/");

    // Декодеры pdf.js лежат за API-маршрутом, а не в статике, поэтому сами в
    // кэш не попадают. Без них сканы с JPEG2000-страницами офлайн не откроются
    assetUrls.push(
      "/api/pdf-worker",
      "/api/pdf-wasm/openjpeg.wasm",
      "/api/pdf-wasm/openjpeg_nowasm_fallback.js",
      "/api/pdf-wasm/jbig2.wasm",
      "/api/pdf-wasm/qcms_bg.wasm",
    );

    for (const { key, image } of currentCategories) {
      pageUrls.push(`/playlist/${key}`);
      if (image) assetUrls.push(image);
    }
    for (const { id } of currentSongs) pageUrls.push(`/song/${id}`, `/songRead/${id}`);
    for (const { filename } of currentSongs) {
      if (filename) assetUrls.push(getUploadPath(filename));
    }
    for (const id of currentStacks) {
      pageUrls.push(`/stack/${id}`, `/stackView/${id}`);
    }
  } else {
    // Инкрементально: только новые
    for (const { key, image } of newCategories) {
      pageUrls.push(`/playlist/${key}`);
      if (image) assetUrls.push(image);
    }
    for (const { id } of newSongs) pageUrls.push(`/song/${id}`, `/songRead/${id}`);
    for (const { filename } of newSongs) {
      if (filename) assetUrls.push(getUploadPath(filename));
    }
    for (const id of newStacks) {
      pageUrls.push(`/stack/${id}`, `/stackView/${id}`);
    }
  }

  const total = pageUrls.length * 2 + assetUrls.length; // *2 = HTML + RSC
  console.log(`[Sync] Страниц: ${pageUrls.length} (×2 RSC), файлов: ${assetUrls.length}`);

  if (total === 0) {
    saveCachedState({ songs: currentSongs, stacks: currentStacks, categories: currentCategories.map((c) => c.key) });
    // Кешировать нечего — но полоса к этому моменту уже показана и ждёт
    // новостей. Без этой строки она навсегда оставалась висеть на нуле:
    // именно так выглядел «0% и ничего не происходит» при каждом запуске,
    // когда всё уже было закешировано раньше
    onProgress({ current: 1, total: 1, done: true });
    return;
  }

  onProgress({ current: 0, total, done: false });
  let done = 0;
  const tick = () => onProgress({ current: ++done, total, done: false });

  // Каждый запрос платит секундной задержкой соединения через Jino сам по
  // себе (проверено — сервер отвечает за 7мс, а через прокси 1–1.7с), и при
  // сотнях запросов строго по одному это складывалось в единицы минут.
  // Ограниченный параллелизм переносит эту задержку на всю пачку разом,
  // вместо того чтобы платить её за каждый файл отдельно.
  const CONCURRENCY = 6;

  async function runBatched<T>(items: T[], worker: (item: T) => Promise<void>) {
    let index = 0;
    const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (index < items.length) {
        const item = items[index++];
        await worker(item);
      }
    });
    await Promise.all(runners);
  }

  // Кэшируем страницы через SW (HTML + RSC пейлоад) — оба запроса одной
  // страницы независимы, поэтому идут вместе
  await runBatched(pageUrls, async (url) => {
    await Promise.all([
      fetch(url, { credentials: "same-origin", cache: "reload" })
        .then((res) => console.log(`[Sync] ${res.ok ? "✓" : "✗"} html ${url}`))
        .catch((e) => console.warn(`[Sync] ✗ html ${url}`, e))
        .finally(tick),
      // RSC payload — для клиентской навигации Next.js App Router
      fetch(url, { credentials: "same-origin", cache: "reload", headers: { "RSC": "1" } })
        .then((res) => console.log(`[Sync] ${res.ok ? "✓" : "✗"} rsc  ${url}`))
        .catch((e) => console.warn(`[Sync] ✗ rsc ${url}`, e))
        .finally(tick),
    ]);
  });

  // Кэшируем ассеты напрямую в нужные бакеты
  await runBatched(assetUrls, async (url) => {
    // Имя кэша должно совпадать с тем, что задано в правиле service worker'а,
    // иначе положенный файл потом не найдётся
    const cacheName = url.startsWith("/uploads/")
      ? "uploads-cache"
      : url.startsWith("/api/pdf-w")
        ? "pdfjs-assets"
        : "category-images";
    const ok = await fetchAndCache(url, cacheName);
    console.log(`[Sync] ${ok ? "✓" : "✗"} asset ${url}`);
    tick();
  });

  saveCachedState({ songs: currentSongs, stacks: currentStacks, categories: currentCategories.map((c) => c.key) });
  onProgress({ current: total, total, done: true });
}

const CACHE_LABELS = [
  "Загружаем ноты…",
  "Синхронизируем программы…",
  "Подготавливаем медиа…",
  "Обновляем библиотеку…",
  "Оптимизируем данные…",
  "Почти готово…",
];

export function ServiceWorkerManager() {
  const { status } = useSession();
  const syncing = useRef(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  // Синхронизация офлайн-очереди при восстановлении сети
  useEffect(() => {
    const handleOnline = async () => {
      const queue = getQueue();
      if (queue.length === 0) return;

      console.log(`[OfflineSync] Сеть восстановлена, очередь: ${queue.length}`);
      addToast({
        title: <span className="font-bold">Синхронизация...</span>,
        description: <span>Отправляем {queue.length} офлайн-изменений</span>,
        timeout: 2000,
      });

      const { synced, failed } = await processOfflineQueue();

      if (synced > 0) {
        addToast({
          title: <span className="font-bold text-white">Синхронизировано ✓</span>,
          description: <span className="text-white">{synced} изменений отправлено на сервер</span>,
          timeout: 4000,
          classNames: { base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white" },
        });
      }
      // В любом случае обновляем кеш при восстановлении сети
      setTimeout(() => runSync(), 2000);
      if (failed > 0) {
        addToast({
          title: <span className="font-bold">Не удалось синхронизировать</span>,
          description: <span>{failed} операций не выполнено, попробуем позже</span>,
          timeout: 5000,
        });
      }
    };

    window.addEventListener("online", handleOnline);

    // Пробуем отправить и при обычном запуске. Раньше очередь ждала события
    // «сеть восстановилась», и запись, попавшая туда при живом интернете,
    // не уходила никогда: событие просто не наступало
    const flushOnStart = async () => {
      if (getQueue().length === 0) return;
      if (!(await canReachBackend())) return;
      handleOnline();
    };
    const startTimer = setTimeout(flushOnStart, 3000);

    return () => {
      window.removeEventListener("online", handleOnline);
      clearTimeout(startTimer);
    };
  }, []);

  // Сервер сообщает что сделал sync с мастером → обновляем SW-кеш
  useEffect(() => {
    const handler = (data: { added: number; updated: number; deleted: number }) => {
      const total = data.added + data.updated + data.deleted;
      if (total === 0) return;
      console.log(`[SW] db-synced от сервера (+${data.added} ~${data.updated} -${data.deleted}), обновляем кеш`);
      // Небольшая задержка чтобы сервер успел применить изменения в БД
      setTimeout(() => runSync(), 1500);
    };
    socket.on("db-synced", handler);
    return () => { socket.off("db-synced", handler); };
  }, []);

  /**
   * Переключились между платой и интернетом — открываемся заново.
   *
   * У платы и сайта могут быть разные сборки, и приложение, открытое с одной,
   * продолжало работать с другой: страницы и данные оказывались вперемешку, и
   * в какой-то момент переставали открываться разделы. Чистая перезагрузка
   * снимает это целиком, а заставка делает её понятной — видно, что приложение
   * переподключается, а не сломалось.
   *
   * Раньше это стояло только на странице программы, то есть почти никогда не
   * срабатывало: сеть чаще меняют, находясь в списках.
   */
  const localServer = useLocalServer();
  const knownIsLocal = useRef<boolean | null>(null);
  useEffect(() => {
    if (localServer.loading) return;

    if (knownIsLocal.current === null) {
      knownIsLocal.current = localServer.isLocal;
      return;
    }
    if (knownIsLocal.current === localServer.isLocal) return;

    knownIsLocal.current = localServer.isLocal;
    try { sessionStorage.setItem(SPLASH_FORCE_KEY, "1"); } catch {}
    window.location.reload();
  }, [localServer.isLocal, localServer.loading]);

  // SW регистрируется всегда
  useEffect(() => {
    // Приложение дошло до этого места, значит запустилось. Счёт неудачных
    // попыток с экрана восстановления обнуляем, иначе следующая заминка сразу
    // привела бы к полному сбросу кеша (см. app/global-error.tsx)
    try { sessionStorage.removeItem("startupRetries"); } catch {}

    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("[SW] Зарегистрирован"))
      .catch((e) => console.error("[SW] Ошибка регистрации:", e));

    // При смене SW-контроллера (новая версия деплоя) — перезагружаем страницу
    // Это гарантирует что клиент и SW всегда одной версии, без "нескольких перезагрузок"
    let firstController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (firstController) {
        console.log("[SW] Новая версия SW — перезагрузка...");
        window.location.reload();
      } else {
        firstController = true; // первая активация SW, перезагрузка не нужна
      }
    });
  }, []);

  const runSync = async () => {
    if (syncing.current) return;
    if (!("serviceWorker" in navigator)) return;
    if (!("caches" in window)) return;
    // Используем реальный пинг бэкенда — navigator.onLine не надёжен
    // когда подключён к RPi-хотспоту без интернета (мобильные ОС = false)
    const reachable = await canReachBackend();
    if (!reachable) return;

    syncing.current = true;
    try {
      /**
       * Полосу показываем не сразу, а если работа затянулась.
       *
       * На первой установке здесь уходят минуты, и без полосы это выглядит как
       * простой — потому она и появлялась заранее. Но когда качать нечего (а
       * это обычный случай при каждом запуске), она мигала на секунду и
       * пропадала, будто что-то скачалось. Полутора секунд хватает, чтобы
       * отличить одно от другого.
       */
      let shown = false;
      const showTimer = setTimeout(() => {
        shown = true;
        setProgress({ current: 0, total: 1, done: false, preparing: true });
      }, 1500);

      // Но висеть на нуле бесконечно она не должна: если за это время не
      // случилось ни одного реального шага, значит что-то не задалось
      // (не отвечает бэкенд, не встал service worker) — полосу убираем,
      // синхронизация всё равно повторится по расписанию, но уже молча
      let started = false;
      const stallGuard = setTimeout(() => {
        if (!started) setProgress(null);
      }, 25_000);

      await waitForSWController();
      await syncCache((p) => {
        started = true;
        clearTimeout(stallGuard);

        // Качать было нечего, и показать мы ещё ничего не успели — значит и
        // мигать незачем
        if (p.done && !shown && p.total <= 1) {
          clearTimeout(showTimer);
          return;
        }

        clearTimeout(showTimer);
        shown = true;
        setProgress(p);
        if (p.done) setTimeout(() => setProgress(null), 3000);
      });
      clearTimeout(stallGuard);
      clearTimeout(showTimer);
      if (!shown) setProgress(null);
    } catch (e) {
      console.error("[Sync] Ошибка:", e);
    } finally {
      syncing.current = false;
    }
  };

  // Синхронизация при авторизации.
  // Несколько попыток вместо одной фиксированной задержки — из-за гонки с
  // useLocalServer (он смонтирован отдельно, в навбаре): пока его проверка
  // платы через mDNS не завершится и не запишет рабочий адрес,
  // canReachBackend() может использовать старую догадку по адресной строке,
  // которая на стороннем роутере ведёт в никуда. Пинг тогда молча падает, а
  // runSync ничего не повторяет сам — единственный шанс был бы упущен.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const delays = [0, 2000, 5000, 10000];
    const timers = delays.map((delay) =>
      setTimeout(() => {
        if (!cancelled) runSync();
      }, delay),
    );
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [status]);

  // Синхронизация по событию (новая песня/стопка добавлена)
  // Задержка 5.5с чтобы тост успел показаться и исчезнуть
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      console.log("[Sync] Запрос на синхронизацию получен");
      timer = setTimeout(() => runSync(), 5500);
    };
    window.addEventListener("sw-sync-needed", handler);
    return () => {
      window.removeEventListener("sw-sync-needed", handler);
      clearTimeout(timer);
    };
  }, []);

  // Удаление песни из кэша при её удалении из БД
  useEffect(() => {
    const handler = async (e: Event) => {
      const { id, filename } = (e as CustomEvent<{ id: string; filename?: string }>).detail;
      if (!id || !("caches" in window)) return;
      console.log(`[Sync] Удаляем из кэша песню ${id}`);
      await deleteFromAllCaches(`/song/${id}`);
      if (filename) await deleteFromAllCaches(`/uploads/${filename}`);
      const state = loadCachedState();
      saveCachedState({ ...state, songs: state.songs.filter((s) => s.id !== id) });
    };
    window.addEventListener("sw-delete-song", handler);
    return () => window.removeEventListener("sw-delete-song", handler);
  }, []);

  // Удаление стопки из кэша при её удалении из БД
  useEffect(() => {
    const handler = async (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id || !("caches" in window)) return;
      console.log(`[Sync] Удаляем из кэша стопку ${id}`);
      await deleteFromAllCaches(`/stack/${id}`);
      await deleteFromAllCaches(`/stackView/${id}`);
      // Обновляем localStorage — убираем удалённую стопку
      const state = loadCachedState();
      saveCachedState({ ...state, stacks: state.stacks.filter((s) => s !== id) });
    };
    window.addEventListener("sw-delete-stack", handler);
    return () => window.removeEventListener("sw-delete-stack", handler);
  }, []);

  // Перекэширование конкретной стопки после её изменения
  useEffect(() => {
    const handler = async (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id || !("caches" in window) || !navigator.onLine) {
        window.dispatchEvent(new CustomEvent("sw-recache-done", { detail: id }));
        return;
      }
      console.log(`[Sync] Перекэшируем стопку ${id}`);

      // Показываем анимацию сразу
      setProgress({ current: 0, total: 2, done: false });

      // Удаляем stale-кэш до фетча — NetworkFirst будет вынужден идти в сеть
      await deleteFromAllCaches(`/stack/${id}`);
      await deleteFromAllCaches(`/stackView/${id}`);

      const urls = [`/stack/${id}`, `/stackView/${id}`];
      for (let i = 0; i < urls.length; i++) {
        try {
          // HTML-версия → кэш pages (прямой переход / F5)
          await fetch(urls[i], { credentials: "same-origin", cache: "reload" });
          // RSC-версия → кэш pages-rsc-app (клиентская навигация Next.js)
          await fetch(urls[i], { credentials: "same-origin", cache: "reload", headers: { "RSC": "1" } });
          console.log(`[Sync] ✓ ${urls[i]}`);
        } catch {}
        setProgress({ current: i + 1, total: 2, done: i === 1 });
      }

      window.dispatchEvent(new CustomEvent("sw-recache-done", { detail: id }));
      setTimeout(() => setProgress(null), 2000);
    };
    window.addEventListener("sw-recache-stack", handler);
    return () => window.removeEventListener("sw-recache-stack", handler);
  }, []);

  // Перекэширование конкретной песни после её изменения
  useEffect(() => {
    const handler = async (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id || !("caches" in window) || !navigator.onLine) {
        window.dispatchEvent(new CustomEvent("sw-recache-done", { detail: id }));
        return;
      }
      console.log(`[Sync] Перекэшируем песню ${id}`);

      // Показываем анимацию сразу
      setProgress({ current: 0, total: 1, done: false });

      // Удаляем stale-кэш до фетча — NetworkFirst будет вынужден идти в сеть
      await deleteFromAllCaches(`/song/${id}`);

      try {
        // HTML-версия → кэш pages (прямой переход / F5)
        await fetch(`/song/${id}`, { credentials: "same-origin", cache: "reload" });
        // RSC-версия → кэш pages-rsc-app (клиентская навигация Next.js)
        await fetch(`/song/${id}`, { credentials: "same-origin", cache: "reload", headers: { "RSC": "1" } });
        console.log(`[Sync] ✓ /song/${id}`);
      } catch {}
      setProgress({ current: 1, total: 1, done: true });

      window.dispatchEvent(new CustomEvent("sw-recache-done", { detail: id }));
      setTimeout(() => setProgress(null), 2000);
    };
    window.addEventListener("sw-recache-song", handler);
    return () => window.removeEventListener("sw-recache-song", handler);
  }, []);

  // Отъезд плашки в кружок готовности — включается с задержкой, чтобы
  // «Готово к офлайн-работе» успели прочитать
  const [collapse, setCollapse] = useState(false);
  useEffect(() => {
    if (!progress?.done) { setCollapse(false); return; }
    // Успеть отыграть до того, как плашку уберут совсем: перекэширование одной
    // ноты держит её всего две секунды
    const timer = setTimeout(() => setCollapse(true), 1000);
    return () => clearTimeout(timer);
  }, [progress?.done]);

  // Typewriter states
  const [typeIndex, setTypeIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [typePhase, setTypePhase] = useState<"typing" | "waiting" | "erasing">("typing");
  const [cursorOn, setCursorOn] = useState(true);

  // Сброс при появлении/исчезновении прогресса
  useEffect(() => {
    if (!progress) return;
    setTypeIndex(0);
    setDisplayText("");
    setTypePhase("typing");
    setCursorOn(true);
  }, [!!progress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Машинописный эффект
  useEffect(() => {
    if (!progress || progress.done) return;
    const label = CACHE_LABELS[typeIndex];

    if (typePhase === "typing") {
      if (displayText.length >= label.length) {
        setTypePhase("waiting");
        return;
      }
      const t = setTimeout(() => setDisplayText(label.slice(0, displayText.length + 1)), 25);
      return () => clearTimeout(t);
    }

    if (typePhase === "waiting") {
      const t = setTimeout(() => setTypePhase("erasing"), 600);
      return () => clearTimeout(t);
    }

    if (typePhase === "erasing") {
      if (displayText.length === 0) {
        setTypeIndex((i) => (i + 1) % CACHE_LABELS.length);
        setTypePhase("typing");
        return;
      }
      const t = setTimeout(() => setDisplayText(displayText.slice(0, -1)), 12);
      return () => clearTimeout(t);
    }
  }, [progress, typePhase, displayText, typeIndex]);

  // Мигание курсора только в паузе (waiting)
  useEffect(() => {
    if (typePhase !== "waiting") { setCursorOn(true); return; }
    const iv = setInterval(() => setCursorOn((c) => !c), 500);
    return () => clearInterval(iv);
  }, [typePhase]);

  if (!progress || progress.total === 0) return null;

  const pct = Math.round((progress.current / progress.total) * 100);
  // Досчитав, плашка сжимается в кружок готовности в правом нижнем углу — так
  // видно, куда смотреть дальше, вместо того чтобы она просто пропала
  const collapsing = progress.done && collapse;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct / 100);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 20,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(255,255,255,0.97)",
        borderRadius: 40,
        padding: "10px 16px 10px 18px",
        boxShadow: "0 4px 20px rgba(125,94,66,0.18)",
        border: "1px solid rgba(189,150,115,0.25)",
        backdropFilter: "blur(8px)",
        // Сжимается в кружок готовности — он стоит тут же, в правом нижнем углу
        transformOrigin: "right center",
        transform: collapsing ? "translate(-14px, 12px) scale(0.32)" : "none",
        opacity: collapsing ? 0 : 1,
        transition: "transform 0.75s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.75s ease",
        pointerEvents: collapsing ? "none" : "auto",
      }}
    >
      {/* Текстовая подпись с typewriter */}
      <span
        style={{
          fontFamily: '"Roboto Slab", serif',
          fontSize: 12,
          fontWeight: 500,
          color: "#7D5E42",
          whiteSpace: "nowrap",
          minWidth: 160,
        }}
      >
        {progress.done
          ? "Готово к офлайн-работе"
          : progress.preparing
            ? "Подготовка приложения…"
            : <>{displayText}<span style={{ opacity: cursorOn ? 1 : 0, transition: "opacity 0.1s" }}>|</span></>
        }
      </span>

      {/* Круговой прогресс */}
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id="pg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BD9673" />
            <stop offset="100%" stopColor="#7D5E42" />
          </linearGradient>
          <linearGradient id="pg-done" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ab187" />
            <stop offset="100%" stopColor="#3d7a57" />
          </linearGradient>
        </defs>
        {/* Трек */}
        <circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke="rgba(189,150,115,0.18)"
          strokeWidth="3.5"
        />
        {/* Прогресс */}
        <circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke={progress.done ? "url(#pg-done)" : "url(#pg-grad)"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "22px 22px",
            transition: "stroke-dashoffset 0.4s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        {/* Процент или галочка */}
        {progress.done ? (
          <text
            x="22" y="22"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fontWeight="700"
            fill="url(#pg-done)"
            style={{ fontFamily: '"Roboto Slab", serif' }}
          >
            ✓
          </text>
        ) : (
          <text
            x="22" y="22"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontWeight="600"
            fill="#7D5E42"
            style={{ fontFamily: '"Roboto Slab", serif' }}
          >
            {pct}%
          </text>
        )}
      </svg>
    </div>
  );
}
