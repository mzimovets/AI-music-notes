"use client";
import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import "@/styles/globals.css";
import { metadata, viewport } from "./metadata";
import { Link } from "@heroui/link";
import clsx from "clsx";

import { AllSongsLibraryContextProvider, Providers } from "./providers";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { NavbarWrapper } from "./NavbarWrapper";
import { MainWrapper } from "./MainWrapper";

const ALL_CATEGORIES = [
  "spiritual_chants", "easter", "carols", "folk",
  "soviet", "military", "childrens", "other",
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
      const songs = await res.json();
      for (const song of songs) {
        await prefetch(`/song/${song._id}`);
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  } catch {}

  console.log("[WarmCache] Готово!");
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registerAndWarm = async () => {
      await navigator.serviceWorker.register("/sw.js");

      // Ждём пока SW активен
      await navigator.serviceWorker.ready;

      // Ждём пока SW возьмёт контроль над страницей (clientsClaim).
      // Без этого fetch() в warmPageCache обходит SW и ничего не кэшируется.
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => resolve(),
            { once: true },
          );
          // Fallback: через 4 сек всё равно запускаем
          setTimeout(resolve, 4000);
        });
      }

      // Небольшая пауза чтобы не нагружать при старте
      await new Promise((r) => setTimeout(r, 2000));
      warmPageCache();
    };

    registerAndWarm().catch(() => {});
  }, []);

  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={clsx("text-foreground font-sans bg-page", fontSans.variable)}
    >
      <head>
        {/* <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F7F4F1" /> */}

        {/* Основная иконка для iOS */}
        {/* */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="any" />

        {/* Фавикон для старых и современных браузеров */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* <link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png"
          sizes="96x96"
        /> */}

        {/* Манифест для PWA */}
        <link rel="manifest" href="/manifest.json" />

        <meta name="theme-color" content="#F7F4F1" />
      </head>

      <body
        className={clsx("text-foreground font-sans bg-page", fontSans.variable)}
      >
        <SessionProvider>
          <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
            <div className="relative flex flex-col">
              <AllSongsLibraryContextProvider>
                <NavbarWrapper />
                <MainWrapper>{children}</MainWrapper>
              </AllSongsLibraryContextProvider>
              <footer className="w-full flex items-center justify-center py-3"></footer>
            </div>
          </Providers>
        </SessionProvider>
      </body>
    </html>
  );
}
