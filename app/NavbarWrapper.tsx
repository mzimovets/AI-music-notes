// app/components/NavbarWrapper.tsx
"use client";

import { usePathname } from "next/navigation";

import { Navbar } from "@/components/navbar"; // твой существующий Navbar

export function NavbarWrapper() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/stackView") ||
    pathname.startsWith("/authPage") ||
    pathname.startsWith("/songRead")
  )
    return null; // скрываем на /stackView

  return <Navbar />;
}
