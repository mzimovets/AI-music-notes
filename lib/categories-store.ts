import { categorySongs } from "@/components/constants";
import { getBackendBaseUrl } from "./client-url";

export interface SongCategory {
  key: string;
  name: string;
  image: string;
}

const CACHE_KEY = "offline-categories-v1";

const readCache = (): SongCategory[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
};

// Снимок должен быть стабильной ссылкой — useSyncExternalStore сравнивает по ===
let current: SongCategory[] = readCache() ?? categorySongs;

const listeners = new Set<() => void>();

const publish = (items: SongCategory[]) => {
  current = items;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(items));
    } catch {}
  }
  listeners.forEach((listener) => listener());
};

export const subscribeToCategories = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Синхронное чтение — для мест, где нельзя вызвать хук. */
export const getCategories = () => current;

export const getServerCategories = () => categorySongs;

export const fetchCategories = async () => {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/categories`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.status === "ok" && Array.isArray(data.items)) {
      publish(data.items);
    }
  } catch {
    // Офлайн — остаёмся на кэше, он уже загружен при инициализации
  }
};

export const saveCategories = async (items: SongCategory[]) => {
  const res = await fetch(`${getBackendBaseUrl()}/categories`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const data = await res.json();
  if (data.status !== "ok") {
    throw new Error(data.message || "Не удалось сохранить категории");
  }
  publish(data.items);
  return data.items as SongCategory[];
};
