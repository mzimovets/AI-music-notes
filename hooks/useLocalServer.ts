"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { setResolvedBackendOverride } from "@/lib/resolved-backend";

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
const RPI_DYNAMIC_DOMAIN = "https://rpi.nevsky-sobor.ru";
/**
 * mDNS-имя платы. На её собственной точке доступа плата подменяет DNS-ответ
 * для songs.nevsky-sobor.ru на себя же — поэтому same-origin находит её сама.
 * Через сторонний роутер (тестировали на Keenetic) подмены нет: DNS-запросы
 * идут через роутер как обычно, а mDNS при этом работает нормально — значит
 * плату можно найти напрямую по этому имени.
 */
const RPI_MDNS_DOMAIN = "https://raspberrypi-songs.local";

async function fetchLocalServerInfo(): Promise<LocalServerInfo> {
  // Таймауты увеличены с 1200-1500 до 4000: через сторонние роутеры (TP-Link,
  // Keenetic) изредка (замерено — 2 из 20 запросов) новое TLS-соединение
  // подвисает на 6-7с при полностью свободном CPU на плате — похоже на
  // сетевую заминку самого роутера/Wi-Fi при установлении соединения, а не
  // на проблему приложения. Короткий таймаут превращал эту заминку в
  // ложное "плата не в сети".
  const [sameOrigin, localDomain, dynamicDomain, mdnsDomain] = await Promise.allSettled([
    fetch("/api/local-server", { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json() as Promise<{ isLocal: boolean; hostname: string | null }>),
    fetch(`${RPI_LOCAL_DOMAIN}/api/local-server`, { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json() as Promise<{ isLocal: boolean; hostname: string | null }>),
    fetch(`${RPI_DYNAMIC_DOMAIN}/api/local-server`, { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json() as Promise<{ isLocal: boolean; hostname: string | null }>),
    // Таймаут заметно больше, чем у обычных доменов: для .local-адреса
    // сначала идёт разрешение имени через mDNS (на iOS это само по себе
    // секунда-две), и только потом установка защищённого соединения. С общими
    // 1,2 секунды запрос обрывался по таймауту, хотя вручную в браузере тот
    // же адрес открывался — там лимита нет
    fetch(`${RPI_MDNS_DOMAIN}/api/local-server`, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json() as Promise<{ isLocal: boolean; hostname: string | null }>),
  ]);

  // same-origin/local/dynamic-домены — уже проверенные в бою пути, их не
  // трогаем. Override нужен только для нового mDNS-пути: он находит плату
  // именно тогда, когда DNS-подмена на точке доступа платы не сработала
  // (сторонний роутер), поэтому и getBackendBaseUrl() на неё полагаться не
  // может — переопределяем на прямой адрес Express через nginx (см. setup-https.sh)
  if (sameOrigin.status === "fulfilled" && sameOrigin.value.isLocal) {
    setResolvedBackendOverride(null);
    return { isLocal: true, hostname: sameOrigin.value.hostname, rpiBaseUrl: "", loading: false };
  }
  if (localDomain.status === "fulfilled" && localDomain.value.isLocal) {
    setResolvedBackendOverride(null);
    return { isLocal: true, hostname: localDomain.value.hostname, rpiBaseUrl: RPI_LOCAL_DOMAIN, loading: false };
  }
  if (dynamicDomain.status === "fulfilled" && dynamicDomain.value.isLocal) {
    setResolvedBackendOverride(null);
    return { isLocal: true, hostname: dynamicDomain.value.hostname, rpiBaseUrl: RPI_DYNAMIC_DOMAIN, loading: false };
  }
  if (mdnsDomain.status === "fulfilled" && mdnsDomain.value.isLocal) {
    setResolvedBackendOverride(`${RPI_MDNS_DOMAIN}:4443`);
    return { isLocal: true, hostname: mdnsDomain.value.hostname, rpiBaseUrl: RPI_MDNS_DOMAIN, loading: false };
  }
  setResolvedBackendOverride(null);
  return { isLocal: false, hostname: null, rpiBaseUrl: "", loading: false };
}

export function useLocalServer(): LocalServerInfo {
  const [state, setState] = useState<LocalServerInfo>({
    isLocal: false, hostname: null, rpiBaseUrl: "", loading: true,
  });
  // Гасим только "мигание" уже найденной платы: если её теряем один раз
  // подряд (см. комментарий в fetchLocalServerInfo про заминки роутера),
  // не сбрасываем статус сразу, а ждём повторного подтверждения потери.
  // Для тех, кто вообще не на локальной сети, статус (и loading) выставляется
  // сразу же — иначе спиннер завис бы на лишние 10с у всех остальных.
  const wasLocal = useRef(false);
  const consecutiveFailures = useRef(0);

  const check = useCallback(async () => {
    const info = await fetchLocalServerInfo();
    if (info.isLocal) {
      consecutiveFailures.current = 0;
      wasLocal.current = true;
      setState(info);
      return;
    }
    consecutiveFailures.current += 1;
    if (!wasLocal.current || consecutiveFailures.current >= 2) {
      wasLocal.current = false;
      setState(info);
    }
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
