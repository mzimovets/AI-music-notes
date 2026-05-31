"use client";
import { useEffect, useState } from "react";

export interface LocalServerInfo {
  /** true — работаем с локальным сервером на Raspberry Pi */
  isLocal: boolean;
  /** mDNS-хостнейм локального сервера, напр. "nevsky-songs.local" */
  hostname: string | null;
  /** true пока запрос не завершился */
  loading: boolean;
}

const CACHE_KEY = "localServerInfo";
const CACHE_TTL_MS = 60_000; // 1 минута

function loadCache(): LocalServerInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}

function saveCache(data: LocalServerInfo) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export function useLocalServer(): LocalServerInfo {
  const [state, setState] = useState<LocalServerInfo>(() => {
    const cached = loadCache();
    return cached ?? { isLocal: false, hostname: null, loading: true };
  });

  useEffect(() => {
    const cached = loadCache();
    if (cached) { setState(cached); return; }

    fetch("/api/local-server")
      .then((r) => r.json())
      .then((data: { isLocal: boolean; hostname: string | null }) => {
        const info: LocalServerInfo = { isLocal: data.isLocal, hostname: data.hostname, loading: false };
        setState(info);
        saveCache(info);
      })
      .catch(() => {
        const info: LocalServerInfo = { isLocal: false, hostname: null, loading: false };
        setState(info);
      });
  }, []);

  return state;
}
