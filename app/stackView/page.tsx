"use client";

import React, { useEffect, useState } from "react";
import { StackViewer } from "./components/StackViewer";
import { CloseButton } from "./components/CloseButton";
import { SidebarButton } from "./components/SidebarButton";

export default function Page() {
  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY < lastScrollY) {
        // прокрутка вверх
        setShowButton(true);
      } else if (currentY > lastScrollY) {
        // прокрутка вниз
        setShowButton(false);
      }

      setLastScrollY(currentY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  return (
    <div>
      <div
        className={`fixed left-3 top-0 z-50 transform-gpu transition-all duration-50
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <SidebarButton />
      </div>
      <div
        className={`fixed right-3 top-0 z-50 transform-gpu transition-all duration-50 
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <CloseButton />
      </div>
      <StackViewer fileUrl="/pdf.pdf" />
    </div>
  );
}
