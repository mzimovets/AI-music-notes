"use client";
import { useEffect, useState } from "react";

export function CacheStats(_props: { songsCount?: number; stacksCount?: number }) {
  const [songsCount, setSongsCount] = useState(0);
  const [stacksCount, setStacksCount] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);

  const fetchCounts = async () => {
    try {
      const res = await fetch("/api/song-stats");
      if (res.ok) {
        const { songsCount, stacksCount } = await res.json();
        setSongsCount(songsCount);
        setStacksCount(stacksCount);
      }
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
    } catch {}
  };

  useEffect(() => {
    fetchCounts();
    calculateCacheSize();
    const handleRecalc = () => {
      fetchCounts();
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
        <span className="text-gray-500 font-medium">{stacksCount}</span> •
        Ноты:{" "}
        <span className="text-gray-500 font-medium">{songsCount}</span> •
        Кэш:{" "}
        <span className="text-gray-500 font-medium">{formatSize(cacheSize)}</span>
      </span>
    </div>
  );
}
