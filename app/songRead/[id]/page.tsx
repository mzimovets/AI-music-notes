"use client";

import { useParams } from "next/navigation";
import { getSongById } from "@/lib/utils";
import { useEffect, useState } from "react";
import { CloseReadButton } from "./components/CloseReadButton";
import { StackViewer } from "@/app/stackView/[id]/components/StackViewer";

export default function SongReadPage() {
  const { id } = useParams<{ id: string }>();
  const [song, setSong] = useState<any>(null);
  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const fetchSong = async () => {
      if (!id) return;
      const data = await getSongById(id);
      setSong(data);
    };
    fetchSong();
  }, [id]);

  // Скрытие кнопки при скролле
  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY < lastScrollY) {
        // прокрутка вверх — показать кнопку
        setShowButton(true);
      } else if (currentY > lastScrollY) {
        // прокрутка вниз — скрыть кнопку
        setShowButton(false);
      }

      setLastScrollY(currentY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  if (!song?.doc?.file?.filename) return null;

  return (
    <div>
      <div
        className={`fixed right-3 top-2 z-50 transform-gpu transition-all duration-50 
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <CloseReadButton />
      </div>

      <div className="flex justify-center mb-2">
        <StackViewer
          fileUrl={`http://localhost:4000/uploads/${song.doc.file.filename}`}
        />
      </div>
    </div>
  );
}
