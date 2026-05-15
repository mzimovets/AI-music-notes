import withSerwist from "@serwist/next";

const withSerwistConfig = withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Исключаем app-build-manifest из precache (отсутствует в prod)
  exclude: [/app-build-manifest\.json$/],
});

export default withSerwistConfig({
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: ["192.168.1.123", "192.168.1.132", "192.168.1.*"],

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
          const fs = require("fs");
          const path = require("path");
          const src = path.resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
          const dest = path.resolve("public/pdf.worker.min.mjs");
          fs.copyFile(src, dest, cb);
        });
      },
    });
    return config;
  },
});
