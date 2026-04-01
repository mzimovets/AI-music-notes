"use client";

import { useEffect, useState } from "react";
import { CloseReadButton } from "./components/CloseReadButton";
import { StackViewer } from "@/app/stackView/[id]/components/StackViewer";
import { ScrollToTop } from "@/app/stack/[id]/components/ScrollToTopButton";
import { useSongContext } from "@/app/song/[id]/SongContextProvider";

export default function SongReadPage() {
  const { songResponse } = useSongContext();
  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY < lastScrollY) {
        setShowButton(true);
      } else if (currentY > lastScrollY) {
        setShowButton(false);
      }

      setLastScrollY(currentY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  if (!songResponse?.doc?.file?.filename) return null;

  return (
    <div>
      <ScrollToTop />
      <div
        className={`fixed right-3 top-2 z-50 transform-gpu transition-all duration-200
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <CloseReadButton />
      </div>

      <div className="flex justify-center mb-2">
        <StackViewer
          fileUrl={`/uploads/${songResponse.doc.file.filename}`}
        />
      </div>
    </div>
  );
}
