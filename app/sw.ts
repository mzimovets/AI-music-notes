import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
} from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Кэшируем сессию NextAuth — без этого оффлайн видно "не авторизован"
    // (defaultCache ставит /api/auth/* как NetworkOnly — переопределяем ДО него)
    {
      matcher: /\/api\/auth\/session/,
      handler: new NetworkFirst({
        cacheName: "auth-session",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({ maxEntries: 1, maxAgeSeconds: 24 * 60 * 60 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // Кэшируем PDF и картинки с бэкенда (через rewrite /uploads/*)
    {
      matcher: ({ request }: { request: Request }) => {
        const path = new URL(request.url).pathname;
        return path.startsWith("/uploads/");
      },
      handler: new CacheFirst({
        cacheName: "uploads-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 500,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // Кэшируем статические картинки категорий из public/songs/
    {
      matcher: ({ request }: { request: Request }) => {
        const path = new URL(request.url).pathname;
        return path.startsWith("/songs/") && /\.(jpg|jpeg|png|webp)$/i.test(path);
      },
      handler: new CacheFirst({
        cacheName: "category-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // HTML страниц — только не-RSC запросы
    {
      matcher: ({ request }: { request: Request }) => {
        if (request.method !== "GET") return false;
        // Пропускаем RSC-запросы в отдельный кэш
        if (request.headers.get("RSC") === "1") return false;
        if (request.headers.get("Next-Router-State-Tree")) return false;
        const path = new URL(request.url).pathname;
        return (
          path === "/" ||
          /^\/(playlist|song|stack|stackView|songRead)(\/[^/]+)?/.test(path)
        );
      },
      handler: new NetworkFirst({
        cacheName: "pages",
        // 0.5s — быстрее переходим к кешу при офлайне или медленной сети
        networkTimeoutSeconds: 0.5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 }),
          new CacheableResponsePlugin({ statuses: [200] }),
        ],
      }),
    },
    // RSC-пейлоады — клиентская навигация Next.js App Router (отдельный кэш)
    // Next.js 15 шлёт RSC: 1 И/ИЛИ Next-Router-State-Tree заголовок
    {
      matcher: ({ request }: { request: Request }) => {
        if (request.method !== "GET") return false;
        const isRsc =
          request.headers.get("RSC") === "1" ||
          !!request.headers.get("Next-Router-State-Tree");
        if (!isRsc) return false;
        const path = new URL(request.url).pathname;
        return (
          path === "/" ||
          /^\/(playlist|song|stack|stackView|songRead)(\/[^/]+)?/.test(path)
        );
      },
      handler: new NetworkFirst({
        cacheName: "pages-rsc-app",
        networkTimeoutSeconds: 0.5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 }),
          new CacheableResponsePlugin({ statuses: [200] }),
        ],
      }),
    },
    // defaultCache покрывает: Next.js static, images, Google Fonts, RSC payloads
    ...defaultCache,
  ],
});

serwist.addEventListeners();
