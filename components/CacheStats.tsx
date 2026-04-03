"use client";
import { useEffect, useState } from "react";

interface Stats {
  songsCount: number;
  stacksCount: number;
  cacheSize: number;
}

export function CacheStats({
  songsCount,
  stacksCount,
}: {
  songsCount: number;
  stacksCount: number;
}) {
  const [stats, setStats] = useState<Stats>({
    songsCount,
    stacksCount,
    cacheSize: 0,
  });

  // Вычисляем размер кэша
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
          } catch {
            // Игнорируем ошибки при расчёте размера отдельных элементов
          }
        }
      }

      setStats((prev) => ({
        ...prev,
        cacheSize: totalSize,
        songsCount,
        stacksCount,
      }));
    } catch (e) {
      console.warn("[CacheStats] Ошибка расчёта размера кэша:", e);
    }
  };

  useEffect(() => {
    // Обновляем счетчики когда меняются пропсы
    setStats((prev) => ({
      ...prev,
      songsCount,
      stacksCount,
    }));
    // Пересчитываем размер кэша
    calculateCacheSize();
  }, [songsCount, stacksCount]);

  useEffect(() => {
    // Первый расчёт при монтировании
    calculateCacheSize();

    // Слушаем события изменения
    const handleSyncNeeded = () => {
      // Пересчитываем размер через 100мс (почти сразу)
      setTimeout(calculateCacheSize, 100);
    };

    const handleDeleteSong = () => {
      calculateCacheSize();
    };

    const handleDeleteStack = () => {
      calculateCacheSize();
    };

    window.addEventListener("sw-sync-needed", handleSyncNeeded);
    window.addEventListener("sw-delete-song", handleDeleteSong);
    window.addEventListener("sw-delete-stack", handleDeleteStack);

    return () => {
      window.removeEventListener("sw-sync-needed", handleSyncNeeded);
      window.removeEventListener("sw-delete-song", handleDeleteSong);
      window.removeEventListener("sw-delete-stack", handleDeleteStack);
    };
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Б";
    const k = 1024;
    const sizes = ["Б", "КБ", "МБ", "ГБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="flex justify-center mt-24 mb-16 text-gray-400 font-bold text-sm">
      <span>
        Стопки:{" "}
        <span className="text-gray-500 font-medium">{stats.stacksCount}</span> •
        Ноты:{" "}
        <span className="text-gray-500 font-medium">{stats.songsCount}</span> •
        Кэш:{" "}
        <span className="text-gray-500 font-medium">
          {formatSize(stats.cacheSize)}
        </span>
      </span>
    </div>
  );
}
