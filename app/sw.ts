import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

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
    // Кэшируем загруженные PDF и картинки с бэкенда (через rewrite /uploads/*)
    {
      matcher: /^\/uploads\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: "uploads-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // defaultCache покрывает: Next.js static, images, Google Fonts, pages (NetworkFirst), RSC
    ...defaultCache,
  ],
});

serwist.addEventListeners();
