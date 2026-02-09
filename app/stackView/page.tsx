"use client";

import React, { useEffect, useState } from "react";
import { StackViewer } from "./components/StackViewer";
import { CloseButton } from "./components/CloseButton";
import { SidebarButton } from "./components/SidebarButton";
import { SideBarStack } from "./components/SideBarStack";

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
        className={`fixed left-3 top-2 z-50 transform-gpu transition-all duration-50
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <SidebarButton />
      </div>
      <SideBarStack onPreview={undefined} />
      <div
        className={`fixed right-3 top-2 z-50 transform-gpu transition-all duration-50 
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <CloseButton />
      </div>
      <p className="flex flex-col text-default-500 text-center mt-2 justify-center font-header gap-2 text-[9px] xs:text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl 3xl:text-4xl">
        Программа
      </p>
      <div className="justify-center flex gap-2  mb-2">
        <p className="text-bold text-sm input-header justify-center text-default-500">
          {/* {mainSongs.length} {getPluralForm(mainSongs.length)} */}
        </p>
      </div>
      <StackViewer fileUrl="/meals-pdf/per-ed.pdf" />
      <StackViewer fileUrl="/pdf.pdf" />
      <StackViewer fileUrl="/meals-pdf/pos-ed.pdf" />
      <p className="flex flex-col mt-2 text-default-500 text-center justify-center font-header gap-2 text-sm sm:text-base md:text-lg">
        Резерв
      </p>
      <div className="justify-center flex gap-2 mb-6">
        <p className="text-bold text-sm input-header justify-center text-default-500">
          {/* {reserveSongs.length} {getPluralForm(reserveSongs.length)} */}
        </p>
      </div>
    </div>
  );
}
