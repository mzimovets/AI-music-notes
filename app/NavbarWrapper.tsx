// app/components/NavbarWrapper.tsx
"use client";

import { Navbar } from "@/components/navbar"; // твой существующий Navbar
import { usePathname } from "next/navigation";

export function NavbarWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith("/stackView")) return null; // скрываем на /stackView
  return <Navbar />;
}
