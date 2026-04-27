"use client";

import { usePathname } from "next/navigation";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStackView = pathname.startsWith("/stackView");
  const isSongRead = pathname.startsWith("/songRead");

  return (
    <>
      <main
        className={
          isStackView || isSongRead
            ? "flex-grow"
            : "md:container md:w-[85%] lg:w-[65%] md:mx-auto max-w-[1600px] pt-4 px-6 flex-grow"
        }
      >
        {children}
      </main>
      {!isSongRead && (
        <footer className="w-full flex items-center justify-center py-3"></footer>
      )}
    </>
  );
}
