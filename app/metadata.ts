// app/metadata.ts
import { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "white" }],
  userScalable: false,
  initialScale: 1,
  maximumScale: 1,
  width: "device-width",
  // Без этого клавиатура на телефоне просто накладывается поверх страницы,
  // а dvh/vh продолжают считаться так, будто её нет — поле пароля пряталось
  // под клавиатурой ровно поэтому. "resizes-content" заставляет браузер
  // по-настоящему сжимать раскладку под клавиатуру, тогда dvh пересчитается
  // сам и обычная прокрутка к сфокусированному полю начинает работать
  interactiveWidget: "resizes-content",
};