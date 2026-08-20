"use client";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

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

  /**
   * Занятый объём спрашиваем у системы, а не считаем сами.
   *
   * Раньше здесь перебирались все записи всех хранилищ и каждая читалась
   * целиком — сотни нот на десятки мегабайт. Один раз при открытии страницы это
   * сходило с рук, но как пересчёт стал регулярным, планшет захлебнулся:
   * ничего не нажималось, а списки бесконечно висели в загрузке.
   *
   * storage.estimate() отдаёт то же число сразу и почти бесплатно.
   */
  const calculateCacheSize = async () => {
    try {
      if (navigator.storage?.estimate) {
        const { usage } = await navigator.storage.estimate();
        if (typeof usage === "number") setCacheSize(usage);
      }
    } catch {}
  };

  useEffect(() => {
    fetchCounts();
    calculateCacheSize();
    const handleRecalc = () => {
      fetchCounts();
      setTimeout(calculateCacheSize, 100);
    };

    /**
     * Числа обновляются на глазах, а не при следующем заходе на страницу.
     *
     * Раньше пересчёт шёл только по событиям правок, и пока идёт кеширование,
     * размер кеша оставался прежним — со стороны выглядело, будто ничего не
     * скачивается. Заодно пересчитываем при возвращении в приложение.
     */
    const timer = setInterval(handleRecalc, 10_000);
    const onVisible = () => { if (document.visibilityState === "visible") handleRecalc(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", handleRecalc);
    const handleDbSynced = (data: { added: number; updated: number; deleted: number }) => {
      if (data.added + data.updated + data.deleted > 0) {
        setTimeout(fetchCounts, 1500);
      }
    };
    window.addEventListener("sw-sync-needed", handleRecalc);
    window.addEventListener("sw-delete-song", handleRecalc);
    window.addEventListener("sw-delete-stack", handleRecalc);
    window.addEventListener("db-sync-complete", fetchCounts);
    socket.on("db-synced", handleDbSynced);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", handleRecalc);
      window.removeEventListener("sw-sync-needed", handleRecalc);
      window.removeEventListener("sw-delete-song", handleRecalc);
      window.removeEventListener("sw-delete-stack", handleRecalc);
      window.removeEventListener("db-sync-complete", fetchCounts);
      socket.off("db-synced", handleDbSynced);
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
        Программы:{" "}
        <span className="text-gray-500 font-medium">{stacksCount}</span> •
        Ноты:{" "}
        <span className="text-gray-500 font-medium">{songsCount}</span> •
        Кэш:{" "}
        <span className="text-gray-500 font-medium">{formatSize(cacheSize)}</span>
      </span>
    </div>
  );
}
