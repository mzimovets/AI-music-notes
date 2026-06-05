"use client";
import { useEffect, useState, useCallback } from "react";

export interface LocalServerInfo {
  /** true — работаем с локальным сервером на Raspberry Pi */
  isLocal: boolean;
  /** mDNS-хостнейм локального сервера, напр. "nevsky-songs.local" */
  hostname: string | null;
  /** true пока запрос не завершился */
  loading: boolean;
}

const RECHECK_INTERVAL_MS = 30_000; // перепроверяем каждые 30 секунд

async function fetchLocalServerInfo(): Promise<LocalServerInfo> {
  try {
    const r = await fetch("/api/local-server", { signal: AbortSignal.timeout(3000) });
    const data: { isLocal: boolean; hostname: string | null } = await r.json();
    return { isLocal: data.isLocal, hostname: data.hostname, loading: false };
  } catch {
    return { isLocal: false, hostname: null, loading: false };
  }
}

export function useLocalServer(): LocalServerInfo {
  const [state, setState] = useState<LocalServerInfo>({ isLocal: false, hostname: null, loading: true });

  const check = useCallback(async () => {
    const info = await fetchLocalServerInfo();
    setState(info);
  }, []);

  useEffect(() => {
    // Первая проверка сразу
    check();

    // Периодическая перепроверка — чтобы переключение сети работало автоматически
    const interval = setInterval(check, RECHECK_INTERVAL_MS);

    // При возврате на вкладку — сразу перепроверить
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);

    // При восстановлении сети (offline→online)
    window.addEventListener("online", check);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", check);
    };
  }, [check]);

  return state;
}
