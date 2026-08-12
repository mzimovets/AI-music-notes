import localFont from "next/font/local";

/**
 * Шрифты лежат в репозитории, а не скачиваются с fonts.googleapis.com во
 * время сборки. Плата собирается там, где интернета может не быть (храм,
 * автономная сеть роутера) — с next/font/google сборка в такой ситуации
 * падает целиком: "Failed to fetch `Inter` from Google Fonts".
 *
 * Файлы — те же самые, что отдаёт Google Fonts: вариативные woff2,
 * латиница (как и было в subsets: ["latin"]).
 */
export const fontSans = localFont({
  src: "../app/fonts/Inter.woff2",
  variable: "--font-sans",
  display: "swap",
});

export const fontMono = localFont({
  src: "../app/fonts/FiraCode.woff2",
  variable: "--font-mono",
  display: "swap",
});
