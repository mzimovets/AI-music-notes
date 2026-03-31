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
    // Кэшируем загруженные PDF и картинки с бэкенда (через rewrite /uploads/*)
    {
      matcher: /^\/uploads\/.*/,
      handler: new CacheFirst({
        cacheName: "uploads-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // defaultCache покрывает: Next.js static, images, Google Fonts, pages (NetworkFirst), RSC
    ...defaultCache,
  ],
});

serwist.addEventListeners();
