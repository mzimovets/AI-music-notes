"use client";
import { useRef, useCallback, useState, useEffect } from "react";
import { useClicker } from "@/components/useClicker";

import { SideBarStack } from "./components/SideBarStack";

import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
import { SongsList } from "./components/SongsList";
import { getPluralForm } from "@/app/stack/[id]/components/GetPluralForm";
import { socket } from "@/lib/socket";
import { StackViewer } from "./components/StackViewer";
import { mealFilesMap } from "@/app/stack/[id]/constants";
import { ScrollToTop } from "@/app/stack/[id]/components/ScrollToTopButton";
import { CloseReadButton } from "@/app/songRead/[id]/components/CloseReadButton";

type StackUpdatedPayload = {
  stackId: string;
  songs: any[];
  mealType: string | null;
  programSelected: string[];
};

export default function Page() {
  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const scrollToReserveSong = (songId: string) => {
    const el = document.getElementById(songId);
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const {
    stackResponse,
    stackSongs,
    setStackSongs,
    setMealType,
    setProgramSelected,
  } = useStackContext();

  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const stackId = stackResponse?.doc?._id;

  useEffect(() => {
    if (!stackId) return;

    const joinCurrentStack = () => {
      socket.emit("join-stack", stackId);
    };

    const handleUpdate = (payload: StackUpdatedPayload) => {
      if (!payload || payload.stackId !== stackId) return;
      setStackSongs(payload.songs || []);
      setProgramSelected(payload.programSelected || []);
      setMealType(payload.mealType || null);
    };

    joinCurrentStack();
    socket.on("connect", joinCurrentStack);
    socket.on("stack-updated", handleUpdate);

    return () => {
      socket.off("connect", joinCurrentStack);
      socket.off("stack-updated", handleUpdate);
    };
  }, [stackId, setMealType, setProgramSelected, setStackSongs]);

  useEffect(() => {
    setStackSongs(stackResponse.doc?.songs || []);
    setProgramSelected(stackResponse.doc?.programSelected || []);
    setMealType(stackResponse.doc?.mealType || null);
  }, [stackResponse, setMealType, setProgramSelected, setStackSongs]);

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

  const mainSongs = stackSongs.filter((s) => !s.isReserve);
  const reserveSongs = stackSongs.filter((s) => s.isReserve);

  const scrollToPageByStep = useCallback((step: -1 | 1) => {
    const scope = viewerContainerRef.current;
    if (!scope) return;
  
    const pages = Array.from(
      scope.querySelectorAll<HTMLElement>("[data-page-number]")
    );
    if (pages.length === 0) return;
  
    let activeIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;
    pages.forEach((page, index) => {
      const distance = Math.abs(page.getBoundingClientRect().top);
      if (distance < minDistance) {
        minDistance = distance;
        activeIndex = index;
      }
    });
  
    const targetIndex = Math.max(0, Math.min(pages.length - 1, activeIndex + step));
    pages[targetIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  
  useClicker(useCallback((direction) => {
    if (direction === "down") scrollToPageByStep(1);
    if (direction === "up") scrollToPageByStep(-1);
  }, [scrollToPageByStep]));

  return (
    <div>
      <ScrollToTop />
      <SideBarStack onPreview={undefined} />
      <div
        className={`fixed right-3 top-2 z-50 transform-gpu transition-all duration-200 
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <CloseReadButton />
      </div>
      <p className="flex justify-center text-center font-header text-sm sm:text-base md:text-lg font-bold mt-4 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#BD9673] to-[#7D5E42] tracking-wide">
        {stackResponse.doc?.name}
      </p>
      <p
        id={`program`}
        className="flex flex-col text-default-500 text-center justify-center font-header gap-2 text-sm sm:text-base md:text-lg"
      >
        Программа
      </p>
      <div className="justify-center flex gap-2 ">
        <p className="text-bold text-sm input-header justify-center text-default-500">
          {mainSongs.length} {getPluralForm(mainSongs.length)}
        </p>
      </div>

      <div ref={viewerContainerRef}>
      {/* Тропарь */}
      {stackResponse.doc?.programSelected.includes("Трапеза") && (
        <StackViewer
          fileUrl={
            `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/uploads/${mealFilesMap[stackResponse.doc?.mealType].start}` ||
            ""
          }
        />
      )}

      <SongsList songs={mainSongs} isReserved={false} />

      {reserveSongs.length > 0 && (
        <>
          <p
            id={`reserve`}
            className="flex flex-col mt-2 text-default-500 text-center justify-center font-header gap-2 text-sm sm:text-base md:text-lg"
          >
            Резерв
          </p>

          <div className="justify-center flex gap-2 mb-2">
            <p className="text-bold text-sm input-header justify-center text-default-500">
              {reserveSongs.length} {getPluralForm(reserveSongs.length)}
            </p>
          </div>

          <div className="justify-center  gap-2 mb-6">
            <SongsList
              songs={reserveSongs}
              isReserved={true}
              onSongClick={scrollToReserveSong}
            />
          </div>
        </>
      )}
      {/* Кондак */}
      {stackResponse.doc?.programSelected.includes("Трапеза") && (
        <StackViewer
          fileUrl={
            `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/uploads/${mealFilesMap[stackResponse.doc?.mealType].end}` ||
            ""
          }
        />
      )}
      </div>
    </div>
  );
}
