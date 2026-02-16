"use client";
import { SessionProvider } from "next-auth/react";
import "@/styles/globals.css";
import { metadata, viewport } from "./metadata";
import { Link } from "@heroui/link";
import clsx from "clsx";

import { Providers } from "./providers";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { NavbarWrapper } from "./NavbarWrapper";
import { MainWrapper } from "./MainWrapper";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={clsx("text-foreground font-sans bg-page", fontSans.variable)}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
        <meta name="theme-color" content="#F7F4F1" />
      </head>

      <body
        className={clsx("text-foreground font-sans bg-page", fontSans.variable)}
      >
        <SessionProvider>
          <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
            <div className="relative flex flex-col">
              <NavbarWrapper />
              <MainWrapper>{children}</MainWrapper>
              <footer className="w-full flex items-center justify-center py-3"></footer>
            </div>
          </Providers>
        </SessionProvider>
      </body>
    </html>
  );
}
