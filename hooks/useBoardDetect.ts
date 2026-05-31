"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// Express API на плате, доступный через HTTPS после setup-https.sh
const BOARD_API_URL = "https://raspberrypi-songs.local:4443";
const PING_URL = `${BOARD_API_URL}/api/ping`;
const PING_INTERVAL_MS = 30_000; // каждые 30 секунд

// sessionStorage: не показывать баннер если пользователь нажал «Не сейчас»
const DISMISSED_KEY = "board-banner-dismissed-v1";

export interface BoardDetectResult {
  boardAvailable: boolean;   // плата доступна
  dismissed: boolean;        // пользователь скрыл баннер
  dismiss: () => void;       // скрыть до следующей сессии
  boardApiUrl: string;       // базовый URL API платы
}

export function useBoardDetect(): BoardDetectResult {
  const [boardAvailable, setBoardAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  });

  // Используем ref чтобы не пересоздавать interval при изменении состояния
  const pingRef = useRef<() => void>(null!);

  const ping = useCallback(async () => {
    try {
      const res = await fetch(PING_URL, {
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
        mode: "cors",
      });
      setBoardAvailable(res.ok);
    } catch {
      setBoardAvailable(false);
    }
  }, []);

  pingRef.current = ping;

  useEffect(() => {
    pingRef.current(); // первый пинг сразу при монтировании

    const id = setInterval(() => pingRef.current(), PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }, []);

  return { boardAvailable, dismissed, dismiss, boardApiUrl: BOARD_API_URL };
}
