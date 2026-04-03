"use client";
import { useEffect, useRef, useState } from "react";

import { useSession } from "next-auth/react";
import { addToast } from "@heroui/react";
import { processOfflineQueue } from "@/lib/offline-sync";
import { getQueue } from "@/lib/offline-queue";
import { getBackendBaseUrl, getUploadPath } from "@/lib/client-url";

const ALL_CATEGORIES = [
  "spiritual_chants",
  "easter",
  "carols",
  "folk",
  "soviet",
  "military",
  "childrens",
  "other",
];

const CATEGORY_IMAGES = [
  "/songs/kants.jpg",
  "/songs/pasha.jpg",
  "/songs/carols.jpg",
  "/songs/narod.jpg",
  "/songs/soviet.jpg",
  "/songs/pobeda.jpg",
  "/songs/children.jpg",
  "/songs/other.jpg",
];

const CACHE_STATE_KEY = "sw-cached-state-v3";

interface Progress {
  current: number;
  total: number;
  done: boolean;
}

interface SongEntry {
  id: string;
  filename: string | null;
}

interface CachedState {
  songs: SongEntry[];
  stacks: string[];
}

function loadCachedState(): CachedState {
  try {
    const raw = localStorage.getItem(CACHE_STATE_KEY);
    return raw ? JSON.parse(raw) : { songs: [], stacks: [] };
  } catch {
    return { songs: [], stacks: [] };
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

  // Определяем что нужно закэшировать
  const newSongs = currentSongs.filter((s) => !prevSongIds.has(s.id));
  const newStacks = currentStacks.filter((id) => !prevStackIds.has(id));

  const pageUrls: string[] = [];
  const assetUrls: string[] = [];

  if (isFirstSync) {
    // Первый запуск: кэшируем всё
    pageUrls.push("/api/auth/session", "/");
    for (const cat of ALL_CATEGORIES) pageUrls.push(`/playlist/${cat}`);
    assetUrls.push(...CATEGORY_IMAGES);
    for (const { id } of currentSongs) pageUrls.push(`/song/${id}`, `/songRead/${id}`);
    for (const { filename } of currentSongs) {
      if (filename) assetUrls.push(getUploadPath(filename));
    }
    for (const id of currentStacks) {
      pageUrls.push(`/stack/${id}`, `/stackView/${id}`);
    }
  } else {
    // Инкрементально: только новые
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
    saveCachedState({ songs: currentSongs, stacks: currentStacks });
    return;
  }

  onProgress({ current: 0, total, done: false });
  let done = 0;

  // Кэшируем страницы через SW (HTML + RSC пейлоад)
  for (const url of pageUrls) {
    // HTML
    try {
      const res = await fetch(url, { credentials: "same-origin", cache: "reload" });
      console.log(`[Sync] ${res.ok ? "✓" : "✗"} html ${url}`);
    } catch (e) {
      console.warn(`[Sync] ✗ html ${url}`, e);
    }
    onProgress({ current: ++done, total, done: false });
    if (done < total) await new Promise((r) => setTimeout(r, 30));

    // RSC payload — для клиентской навигации Next.js App Router
    try {
      const res = await fetch(url, {
        credentials: "same-origin",
        cache: "reload",
        headers: { "RSC": "1" },
      });
      console.log(`[Sync] ${res.ok ? "✓" : "✗"} rsc  ${url}`);
    } catch (e) {
      console.warn(`[Sync] ✗ rsc ${url}`, e);
    }
    onProgress({ current: ++done, total, done: false });
    if (done < total) await new Promise((r) => setTimeout(r, 30));
  }

  // Кэшируем ассеты напрямую в нужные бакеты
  for (const url of assetUrls) {
    const cacheName = url.startsWith("/uploads/") ? "uploads-cache" : "category-images";
    const ok = await fetchAndCache(url, cacheName);
    console.log(`[Sync] ${ok ? "✓" : "✗"} asset ${url}`);
    onProgress({ current: ++done, total, done: false });
    if (done < total) await new Promise((r) => setTimeout(r, 50));
  }

  saveCachedState({ songs: currentSongs, stacks: currentStacks });
  onProgress({ current: total, total, done: true });
}

const CACHE_LABELS = [
  "Загружаем ноты…",
  "Синхронизируем стопки…",
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
        // Обновляем SW-кэш после синхронизации
        window.dispatchEvent(new CustomEvent("sw-sync-needed"));
      }
      if (failed > 0) {
        addToast({
          title: <span className="font-bold">Не удалось синхронизировать</span>,
          description: <span>{failed} операций не выполнено, попробуем позже</span>,
          timeout: 5000,
        });
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // SW регистрируется всегда
  useEffect(() => {
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
    if (!navigator.onLine) return;

    syncing.current = true;
    try {
      await waitForSWController();
      await syncCache((p) => {
        setProgress(p);
        if (p.done) setTimeout(() => setProgress(null), 3000);
      });
    } catch (e) {
      console.error("[Sync] Ошибка:", e);
    } finally {
      syncing.current = false;
    }
  };

  // Синхронизация при авторизации
  useEffect(() => {
    if (status !== "authenticated") return;
    runSync();
  }, [status]);

  // Синхронизация по событию (новая песня/стопка добавлена)
  useEffect(() => {
    const handler = () => {
      console.log("[Sync] Запрос на синхронизацию получен");
      runSync();
    };
    window.addEventListener("sw-sync-needed", handler);
    return () => window.removeEventListener("sw-sync-needed", handler);
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
