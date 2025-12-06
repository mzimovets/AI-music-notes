"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { getData } from "@/lib/utils";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export const SongsLibraryContext = React.createContext<{
  albumsPromise: Promise<any[]>;
} | null>(null);

export function SongsLibraryContextProvider({
  children,
  albumsPromise,
}: {
  children: React.ReactNode;
  albumsPromise: Promise<any[]>;
}) {
  return (
    <SongsLibraryContext.Provider value={{ albumsPromise }}>
      {children}
    </SongsLibraryContext.Provider>
  );
}

export function useSongsLibraryContext() {
  const context = React.useContext(SongsLibraryContext);
  if (!context) {
    throw new Error("component must be in SongsLibraryContext");
  }
  return context;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
    </HeroUIProvider>
  );
}
