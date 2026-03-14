"use client";

import { SessionProvider } from "next-auth/react";
import clsx from "clsx";

import { AllSongsLibraryContextProvider, Providers } from "./providers";
import { NavbarWrapper } from "./NavbarWrapper";
import { MainWrapper } from "./MainWrapper";

import { fontSans } from "@/config/fonts";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import "@/styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      className={clsx("text-foreground font-sans bg-page", fontSans.variable)}
      lang="en"
    >
      <head>
        {/* <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F7F4F1" /> */}

        {/* Основная иконка для iOS */}
        {/* */}
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" sizes="any" />

        {/* Фавикон для старых и современных браузеров */}
        <link href="/favicon.ico" rel="icon" sizes="any" />
        {/* <link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png"
          sizes="96x96"
        /> */}

        {/* Манифест для PWA */}
        <link href="/manifest.json" rel="manifest" />

        <meta content="#F7F4F1" name="theme-color" />
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
              <footer className="w-full flex items-center justify-center py-3" />
            </div>
          </Providers>
        </SessionProvider>
      </body>
    </html>
  );
}
