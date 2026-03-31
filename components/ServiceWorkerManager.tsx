"use client";
import { useEffect, useRef } from "react";

import { useSession } from "next-auth/react";

const ALL_CATEGORIES = [
  "spiritual_chants",
  "easter",
  "carols",
  "folk",
  "soviet",
  "military",
  "childrens",
  "other",
];

async function warmPageCache() {
  console.log("[WarmCache] Начинаю прогрев кэша...");

  const prefetch = async (url: string) => {
    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (res.ok) console.log(`[WarmCache] ✓ ${url}`);
      else console.warn(`[WarmCache] ✗ ${url} (${res.status})`);
    } catch (e) {
      console.warn(`[WarmCache] ✗ ${url}`, e);
    }
  };

  // Кэшируем сессию — без неё оффлайн видно "не авторизован"
  await prefetch("/api/auth/session");

  await prefetch("/");
  for (const cat of ALL_CATEGORIES) {
    await prefetch(`/playlist/${cat}`);
    await new Promise((r) => setTimeout(r, 200));
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/songs`,
      { credentials: "same-origin" },
    );
    if (res.ok) {
      const songs: { _id: string }[] = await res.json();
      for (const song of songs) {
        await prefetch(`/song/${song._id}`);
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  } catch {}

  console.log("[WarmCache] Готово!");
}

export function ServiceWorkerManager() {
  const { status } = useSession();
  const warmed = useRef(false);

  // SW регистрируется всегда
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // Прогрев кэша — ТОЛЬКО когда авторизован
  // (если не авторизован, fetch страниц вернёт /authPage и закэширует не то)
  useEffect(() => {
    if (status !== "authenticated" || warmed.current) return;
    if (!("serviceWorker" in navigator)) return;

    const doWarm = async () => {
      await navigator.serviceWorker.ready;

      // Ждём пока SW возьмёт контроль (clientsClaim после установки)
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => resolve(),
            { once: true },
          );
          setTimeout(resolve, 4000); // fallback
        });
      }

      await new Promise((r) => setTimeout(r, 1000));
      warmed.current = true;
      warmPageCache();
    };

    doWarm().catch(() => {});
  }, [status]);

  return null;
}
