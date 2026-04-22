"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CloseReadButton } from "./components/CloseReadButton";
import { StackViewer } from "@/app/stackView/[id]/components/StackViewer";
import { ScrollToTop } from "@/app/stack/[id]/components/ScrollToTopButton";
import { useClicker } from "@/components/useClicker";
import { ClickerIndicator } from "@/components/ClickerIndicator";
import { useSongContext } from "@/app/song/[id]/SongContextProvider";
import { getUploadPath } from "@/lib/client-url";
import { useSession } from "next-auth/react";
import { SwipeBookViewer, SwipeBookViewerHandle } from "@/app/stackView/[id]/components/SwipeBookViewer";

export default function SongReadPage() {
  const { songResponse } = useSongContext();
  const { data: session, status: sessionStatus } = useSession();
  const isSinger = sessionStatus === "loading" ? true : session?.user?.role !== "регент";

  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const flipViewerRef = useRef<SwipeBookViewerHandle>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const viewModeRef = useRef<"scroll" | "book">("scroll");

  // Режим просмотра — общий с /stackView через localStorage
  const [viewMode, setViewMode] = useState<"scroll" | "book">("scroll");
  const [viewerHeight, setViewerHeight] = useState(() =>
    typeof window !== "undefined" ? Math.max(400, window.innerHeight) : 600
  );
  const [pdfData, setPdfData] = useState<ArrayBuffer | undefined>();

  const startHideTimer = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowButton(false), 3000);
  }, []);

  // Читаем сохранённый режим из localStorage после монтирования
  useEffect(() => {
    const saved = localStorage.getItem("stackViewMode");
    if (saved === "book" || saved === "scroll") {
      setViewMode(saved);
      viewModeRef.current = saved;
      if (saved === "book") startHideTimer();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Сохраняем режим при изменении
  useEffect(() => {
    viewModeRef.current = viewMode;
    localStorage.setItem("stackViewMode", viewMode);
    if (viewMode === "book") {
      setShowButton(true);
      startHideTimer();
    } else {
      clearTimeout(hideTimer.current);
      setShowButton(true);
    }
  }, [viewMode, startHideTimer]);

  // Высота контейнера для книги
  useEffect(() => {
    const update = () => setViewerHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Блокируем скролл страницы в режиме книги.
  // scrollbarGutter: stable — резервируем место под скроллбар всегда,
  // чтобы переключатель внизу не сдвигался при его появлении/скрытии.
  useEffect(() => {
    document.body.style.overflow = viewMode === "book" ? "hidden" : "";
    document.documentElement.style.scrollbarGutter = "stable";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.scrollbarGutter = "";
    };
  }, [viewMode]);

  // Загружаем байты PDF один раз
  const fileUrl = songResponse?.doc?.file?.filename
    ? getUploadPath(songResponse.doc.file.filename)
    : null;

  useEffect(() => {
    if (!fileUrl) return;
    setPdfData(undefined);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok || cancelled) return;
        const bytes = await res.arrayBuffer();
        if (!cancelled) setPdfData(bytes);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [fileUrl]);

  // Скролл — показываем кнопки только в режиме пролистывания
  useEffect(() => {
    const onScroll = () => {
      if (viewModeRef.current === "book") return;
      const currentY = window.scrollY;
      if (currentY < lastScrollY) setShowButton(true);
      else if (currentY > lastScrollY) setShowButton(false);
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  // Тап в режиме книги — показать/скрыть с таймером
  const handleBookTap = useCallback(() => {
    setShowButton((v) => {
      const next = !v;
      clearTimeout(hideTimer.current);
      if (next) startHideTimer();
      return next;
    });
  }, [startHideTimer]);

  const scrollToPageByStep = useCallback((step: -1 | 1) => {
    if (viewModeRef.current === "book") {
      const current = flipViewerRef.current?.getActivePage() ?? 1;
      flipViewerRef.current?.goToPage(current + step);
      return;
    }
    const scope = viewerContainerRef.current;
    if (!scope) return;
    const pages = Array.from(scope.querySelectorAll<HTMLElement>("[data-page-number]"));
    if (pages.length === 0) return;
    let activeIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;
    pages.forEach((page, index) => {
      const distance = Math.abs(page.getBoundingClientRect().top);
      if (distance < minDistance) { minDistance = distance; activeIndex = index; }
    });
    const targetIndex = Math.max(0, Math.min(pages.length - 1, activeIndex + step));
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

  // Кликер
  const { isConnected: clickerConnected } = useClicker(useCallback((direction) => {
    if (direction === "down") scrollToPageByStep(1);
    if (direction === "up") scrollToPageByStep(-1);
  }, [scrollToPageByStep]));

  if (!songResponse?.doc?.file?.filename) return null;

  const visible = showButton ? "scale-100 opacity-100" : "scale-0 opacity-0";

  return (
    <div>
      {/* Режим книги */}
      {viewMode === "book" && fileUrl && (
        <div className="fixed inset-0 z-20 bg-[#F7F4F1] flex flex-col">
          <div className="flex-1 overflow-hidden">
            <SwipeBookViewer
              ref={flipViewerRef}
              pdfUrl={fileUrl}
              pdfData={pdfData}
              height={viewerHeight}
              onTap={handleBookTap}
            />
          </div>
        </div>
      )}

      {viewMode === "scroll" && <ScrollToTop />}

      {!isSinger && (
        <ClickerIndicator
          isConnected={clickerConnected}
          hidden={!showButton}
        />
      )}

      {/* Кнопка закрытия — справа сверху */}
      <div className={`fixed right-3 top-2 z-50 transform-gpu transition-all duration-200 ${visible}`}>
        <CloseReadButton />
      </div>

      {/* Переключатель режимов — по центру снизу */}
      <div className={`fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-200 ${visible}`}>
        <div className="flex gap-1 items-center px-1.5 py-1.5 bg-default-100 rounded-xl shadow-md pointer-events-auto">
          <button
            title="Листание"
            onClick={() => setViewMode("scroll")}
            className={`px-5 py-1.5 rounded-lg transition-colors ${
              viewMode === "scroll"
                ? "bg-white text-[#7D5E42] shadow-sm"
                : "text-default-400 hover:text-default-600"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <button
            title="Книга"
            onClick={() => setViewMode("book")}
            className={`px-5 py-1.5 rounded-lg transition-colors ${
              viewMode === "book"
                ? "bg-white text-[#7D5E42] shadow-sm"
                : "text-default-400 hover:text-default-600"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </button>
          {viewMode === "book" && (
            <button
              title="На первую страницу"
              onClick={() => flipViewerRef.current?.goToPage(1)}
              className="px-3 py-1.5 rounded-lg transition-colors text-default-400 hover:text-[#7D5E42]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7"/>
                <polyline points="18 17 13 12 18 7"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Режим пролистывания */}
      {viewMode === "scroll" && (
        <div ref={viewerContainerRef} className="flex justify-center mb-2">
          <StackViewer fileUrl={getUploadPath(songResponse.doc.file.filename)} />
        </div>
      )}
    </div>
  );
}
