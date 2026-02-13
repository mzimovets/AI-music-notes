"use client";
import React, { useEffect, useState } from "react";
import { CloseButton } from "./components/CloseButton";
import { SidebarButton } from "./components/SidebarButton";
import { SideBarStack } from "./components/SideBarStack";
import { useRouter } from "next/navigation";
import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
import { SongsList } from "./components/SongsList";
import { getPluralForm } from "@/app/stack/[id]/components/GetPluralForm";
import { DeleteModal } from "./components/DeleteModal";
import { socket } from "@/lib/socket";

export default function Page() {
  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  console.log("CONTEXT", {
    stackResponse,
    stackSongs,
    removeSong,
    setStackSongs,
    mealType,
    setMealType,
    programSelected,
    setProgramSelected,
  });

  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!stackResponse?.doc?._id || joined) return;

    const stackId = stackResponse.doc._id;
    console.log("JOIN ROOM:", stackId);

    socket.emit("join-stack", stackId);

    const handleUpdate = (updatedSongs) => {
      console.log("RECEIVED:", updatedSongs);
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
      <SideBarStack onPreview={undefined} />
      <div
        className={`fixed right-3 top-2 z-50 transform-gpu transition-all duration-50 
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <CloseButton />
      </div>
      <p className="flex flex-col text-default-500 text-center mt-2 justify-center font-header gap-2 text-[9px] xs:text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl 3xl:text-4xl">
        {stackResponse.doc?.name}
      </p>
      <div className="justify-center flex gap-2  mb-2">
        <p className="text-bold text-sm input-header justify-center text-default-500">
          {mainSongs.length} {getPluralForm(mainSongs.length)}
        </p>
      </div>
      <SongsList songs={mainSongs} isReserved={false} />

      {reserveSongs.length > 0 && (
        <>
          <p className="flex flex-col mt-2 text-default-500 text-center justify-center font-header gap-2 text-sm sm:text-base md:text-lg">
            Резерв
          </p>

          <div className="justify-center flex gap-2 mb-2">
            <p className="text-bold text-sm input-header justify-center text-default-500">
              {reserveSongs.length} {getPluralForm(reserveSongs.length)}
            </p>
          </div>

          <div className="justify-center  gap-2 mb-6">
            <SongsList songs={reserveSongs} isReserved={true} />
          </div>
        </>
      )}
    </div>
  );
}
