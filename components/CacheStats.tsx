"use client";
import { useEffect, useState } from "react";

const SONGS_OFFLINE_KEY = "offline-songs-v1";
const STACKS_OFFLINE_KEY = "offline-stacks-v1";

export function CacheStats({
  songsCount,
  stacksCount,
}: {
  songsCount: number;
  stacksCount: number;
}) {
  const [cacheSize, setCacheSize] = useState(0);
  const [localSongsCount, setLocalSongsCount] = useState(0);
  const [localStacksCount, setLocalStacksCount] = useState(0);

  const readLocalCounts = () => {
    try {
      const songs = localStorage.getItem(SONGS_OFFLINE_KEY);
      if (songs) setLocalSongsCount(JSON.parse(songs).length);
    } catch {}
    try {
      const stacks = localStorage.getItem(STACKS_OFFLINE_KEY);
      if (stacks) setLocalStacksCount(JSON.parse(stacks).length);
    } catch {}
  };

  const calculateCacheSize = async () => {
    if (!("caches" in window)) return;
    try {
      let totalSize = 0;
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        for (const request of keys) {
          try {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          } catch {}
        }
      }
      setCacheSize(totalSize);
    } catch (e) {
      console.warn("[CacheStats] Ошибка расчёта размера кэша:", e);
    }
  };

  useEffect(() => {
    readLocalCounts();
    calculateCacheSize();
    const handleRecalc = () => {
      readLocalCounts();
      setTimeout(calculateCacheSize, 100);
    };
    window.addEventListener("sw-sync-needed", handleRecalc);
    window.addEventListener("sw-delete-song", handleRecalc);
    window.addEventListener("sw-delete-stack", handleRecalc);
    return () => {
      window.removeEventListener("sw-sync-needed", handleRecalc);
      window.removeEventListener("sw-delete-song", handleRecalc);
      window.removeEventListener("sw-delete-stack", handleRecalc);
    };
  }, []);

  // Обновляем локальные счётчики когда пропсы меняются (данные загрузились)
  useEffect(() => {
    if (songsCount > 0) setLocalSongsCount(songsCount);
  }, [songsCount]);
  useEffect(() => {
    if (stacksCount > 0) setLocalStacksCount(stacksCount);
  }, [stacksCount]);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Б";
    const k = 1024;
    const sizes = ["Б", "КБ", "МБ", "ГБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="flex justify-center mt-6 text-gray-400 font-bold text-sm">
      <span>
        Стопки:{" "}
        <span className="text-gray-500 font-medium">{localStacksCount}</span> •
        Ноты:{" "}
        <span className="text-gray-500 font-medium">{localSongsCount}</span> •
        Кэш:{" "}
        <span className="text-gray-500 font-medium">
          {formatSize(cacheSize)}
        </span>
      </span>
    </div>
  );
}
