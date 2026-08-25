import withSerwist from "@serwist/next";
import fs from "fs";
import path from "path";

const withSerwistConfig = withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Исключаем app-build-manifest из precache (отсутствует в prod)
  exclude: [/app-build-manifest\.json$/],
});

// Идентификатор сборки. Попадает и в клиент, и в серверный маршрут, поэтому
// вкладка может заметить, что на сервере уже другая версия, и предложить
// обновиться — вместо того чтобы молча ломаться на серверных действиях
const BUILD_ID = process.env.BUILD_ID || String(Date.now());

export default withSerwistConfig({
  generateBuildId: () => BUILD_ID,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: ["192.168.1.123", "192.168.1.132", "192.168.1.*"],
  experimental: {
    // Ноты — это сканы PDF, легко превышают дефолтный лимит 1 МБ
    // для Server Actions (addSong идёт через "use server")
    serverActions: { bodySizeLimit: "50mb" },
    // Сервер общий (4 ГБ, без подкачки, ещё как минимум один сайт рядом).
    // По умолчанию Next.js собирает статические страницы в несколько
    // параллельных процессов по числу ядер — на пике памяти не хватало
    // ровно на запуск ещё одного такого процесса (spawn ENOMEM), хотя
    // "свободно" по free -h было больше 2 ГБ. Один процесс вместо
    // нескольких — сборка чуть дольше, зато не требует пикового запаса
    cpus: 1,
  },

  async headers() {
    return [
      {
        source: "/:path*.mjs",
        headers: [{ key: "Content-Type", value: "application/javascript" }],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/uploads/:path*`,
      },
    ];
  },

  webpack(config) {
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.afterEmit.tapAsync("CopyPdfWorker", (compilation, cb) => {
          const src = path.resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
          const dest = path.resolve("public/pdf.worker.min.mjs");
          fs.copyFile(src, dest, cb);
        });
      },
    });
    return config;
  },
});
