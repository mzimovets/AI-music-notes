"use client";
import React, { useEffect, useState } from "react";

import { SidebarButton } from "./components/SidebarButton";
import { SideBarStack } from "./components/SideBarStack";
import { useRouter } from "next/navigation";
import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
import { SongsList } from "./components/SongsList";
import { getPluralForm } from "@/app/stack/[id]/components/GetPluralForm";
import { DeleteModal } from "./components/DeleteModal";
import { socket } from "@/lib/socket";
import { StackViewer } from "./components/StackViewer";
import { mealFilesMap } from "@/app/stack/[id]/constants";
import { ScrollToTop } from "@/app/stack/[id]/components/ScrollToTopButton";
import { CloseReadButton } from "@/app/songRead/[id]/components/CloseReadButton";

export default function Page() {
  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hasSavedChanges, setHasSavedChanges] = useState(false);

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
    removeSong,
    setStackSongs,
    mealType,
    setMealType,
    programSelected,
    setProgramSelected,
  } = useStackContext();

  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!stackResponse?.doc?._id || joined) return;

    const stackId = stackResponse.doc._id;

    socket.emit("join-stack", stackId);

    const handleUpdate = (updatedSongs) => {
      setStackSongs(updatedSongs);
    };

    socket.on("stack-updated", handleUpdate);
    setJoined(true);

    return () => {
      socket.off("stack-updated", handleUpdate);
    };
  }, [stackResponse, joined]);

  useEffect(() => {
    setStackSongs(stackResponse.doc?.songs || []);
    setProgramSelected(stackResponse.doc?.programSelected || []);
    setMealType(stackResponse.doc?.mealType || null);
  }, [stackResponse]);

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
      {/* Тропарь */}
      {stackResponse.doc?.programSelected.includes("Трапеза") && (
        <StackViewer
          fileUrl={
            `http://localhost:4000/uploads/${mealFilesMap[stackResponse.doc?.mealType].start}` ||
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
            `http://localhost:4000/uploads/${mealFilesMap[stackResponse.doc?.mealType].end}` ||
            ""
          }
        />
      )}
    </div>
  );
}
