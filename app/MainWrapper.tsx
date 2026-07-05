"use client";

import { usePathname } from "next/navigation";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStackView = pathname.startsWith("/stackView");
  const isSongRead = pathname.startsWith("/songRead");
  const isAuthPage = pathname.startsWith("/authPage");
  const isSongPage = pathname.startsWith("/song/");

  return (
    <>
      <main
        className={
          isStackView || isSongRead || isAuthPage
            ? "flex-grow"
            : isSongPage
              ? "md:w-[85%] md:mx-auto max-w-[1600px] pt-4 px-6 flex-grow"
              : "md:container md:w-[85%] lg:w-[80%] md:mx-auto max-w-[1600px] pt-4 px-6 flex-grow"
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
