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
  allowedDevOrigins: ["192.168.1.123"],

  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/uploads/:path*`,
      },
    ];
  },
});
