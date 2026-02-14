"use client";

import { usePathname } from "next/navigation";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStackView = pathname.startsWith("/stackView");
  const isSongRead = pathname.startsWith("/songRead");

  return (
    <main
      className={
        isStackView || isSongRead
          ? "flex-grow" // без ограничений
          : "container mx-auto max-w-7xl pt-4 px-6 flex-grow"
      }
    >
      {children}
    </main>
  );
}
