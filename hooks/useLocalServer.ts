"use client";
import { useEffect, useState, useCallback } from "react";

export interface LocalServerInfo {
  isLocal: boolean;
  hostname: string | null;
  loading: boolean;
  /**
   * Base URL for RPi-specific API calls.
   * "" — same-origin (DNS intercepts correctly).
   * "https://local.nevsky-sobor.ru" — direct subdomain, bypasses iCloud Private Relay.
   */
  rpiBaseUrl: string;
}

const RECHECK_INTERVAL_MS = 10_000;
const RPI_LOCAL_DOMAIN = "https://local.nevsky-sobor.ru";

async function fetchLocalServerInfo(): Promise<LocalServerInfo> {
  // Try both in parallel: same-origin (works if DNS intercepts) and direct local subdomain
  const [sameOrigin, localDomain] = await Promise.allSettled([
    fetch("/api/local-server", { signal: AbortSignal.timeout(1500) })
      .then((r) => r.json() as Promise<{ isLocal: boolean; hostname: string | null }>),
    fetch(`${RPI_LOCAL_DOMAIN}/api/local-server`, { signal: AbortSignal.timeout(1200) })
      .then((r) => r.json() as Promise<{ isLocal: boolean; hostname: string | null }>),
  ]);

  // Same-origin takes priority (DNS interception works — cleanest path)
  if (sameOrigin.status === "fulfilled" && sameOrigin.value.isLocal) {
    return { isLocal: true, hostname: sameOrigin.value.hostname, rpiBaseUrl: "", loading: false };
  }
  // Fallback: direct local subdomain (bypasses iCloud Private Relay)
  if (localDomain.status === "fulfilled" && localDomain.value.isLocal) {
    return { isLocal: true, hostname: localDomain.value.hostname, rpiBaseUrl: RPI_LOCAL_DOMAIN, loading: false };
  }
  return { isLocal: false, hostname: null, rpiBaseUrl: "", loading: false };
}

export function useLocalServer(): LocalServerInfo {
  const [state, setState] = useState<LocalServerInfo>({
    isLocal: false, hostname: null, rpiBaseUrl: "", loading: true,
  });

  const check = useCallback(async () => {
    const info = await fetchLocalServerInfo();
    setState(info);
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, RECHECK_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, [check]);

  return state;
}
