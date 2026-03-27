"use client";

import { useParams } from "next/navigation";
import { getSongById } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { CloseReadButton } from "./components/CloseReadButton";
import { ClickerIndicator } from "@/components/ClickerIndicator";
import { StackViewer } from "@/app/stackView/[id]/components/StackViewer";
import { ScrollToTop } from "@/app/stack/[id]/components/ScrollToTopButton";
import { useClicker } from "@/components/useClicker";

export default function SongReadPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const isRegent = session?.user?.role === "регент";
  const [song, setSong] = useState<any>(null);
  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);

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
      if (currentY < lastScrollY) setShowButton(true);
      else if (currentY > lastScrollY) setShowButton(false);
      setLastScrollY(currentY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  // Общая функция скролла — используется и клавиатурой и кликером
  const scrollToPageByStep = useCallback((step: -1 | 1) => {
    const scope = viewerContainerRef.current;
    if (!scope) return;

    const pages = Array.from(
      scope.querySelectorAll<HTMLElement>("[data-page-number]"),
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

    const targetIndex = Math.max(
      0,
      Math.min(pages.length - 1, activeIndex + step),
    );
    pages[targetIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Клавиатура
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || target.isContentEditable;
    };

    const isPageDown = (e: KeyboardEvent) =>
      e.key === "PageDown" || e.code === "PageDown" || e.key === "ArrowDown";
    const isPageUp = (e: KeyboardEvent) =>
      e.key === "PageUp" || e.code === "PageUp" || e.key === "ArrowUp";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (isPageDown(e) || isPageUp(e)) e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (isPageDown(e)) scrollToPageByStep(1);
      else if (isPageUp(e)) scrollToPageByStep(-1);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [scrollToPageByStep]);

  // Кликер через WebSocket
  useClicker(
    useCallback(
      (direction) => {
        if (direction === "down") scrollToPageByStep(1);
        if (direction === "up") scrollToPageByStep(-1);
      },
      [scrollToPageByStep],
    ),
  );

  if (!song?.doc?.file?.filename) return null;

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
      {isRegent && (
        <div className="fixed left-3 bottom-3 z-40">
          <ClickerIndicator />
        </div>
      )}

      <div ref={viewerContainerRef} className="flex justify-center mb-2">
        <StackViewer
          fileUrl={`${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/uploads/${song.doc.file.filename}`}
        />
      </div>
    </div>
  );
}
