"use client";
import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Skeleton } from "@heroui/react";

// ─── Public handle (same interface as DearFlipViewerHandle) ──────────────────
export interface SwipeBookViewerHandle {
  goToPage: (page: number) => void;
  getActivePage: () => number;
  navigateStep: (step: -1 | 1) => void;
}

export interface SwipeBookViewerProps {
  pdfUrl: string;
  /** Готовые байты PDF — если переданы, не скачиваем повторно */
  pdfData?: ArrayBuffer;
  height: number;
  /** Диапазоны страниц с реальным контентом (из X-Song-Pages). На мобайле пропускаем остальные. */
  contentRanges?: { offset: number; count: number }[];
  /** Вызывается при коротком тапе/клике (не свайпе) */
  onTap?: () => void;
  /** Вызывается при смене текущей страницы */
  onPageChange?: (page: number) => void;
}

// ─── Single page canvas renderer ─────────────────────────────────────────────
function PdfPage({
  pdfDoc,
  pageNum,
  targetHeight,
  isLeft,
  isRight,
  isSingle,
}: {
  pdfDoc: any;
  pageNum: number;
  targetHeight: number;
  isLeft?: boolean;
  isRight?: boolean;
  isSingle?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
      }

      const page = await pdfDoc.getPage(pageNum);
      if (cancelled) return;

      const viewport = page.getViewport({ scale: 1 });
      const scale = targetHeight / viewport.height;
      const scaledViewport = page.getViewport({ scale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Рендерим в offscreen canvas — видимый не трогаем пока не готово
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.floor(scaledViewport.width * dpr);
      offscreen.height = Math.floor(scaledViewport.height * dpr);
      const ctx = offscreen.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      renderTaskRef.current = page.render({ canvasContext: ctx, viewport: scaledViewport });
      try {
        await renderTaskRef.current.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") console.error(err);
        return;
      }

      if (cancelled) return;

      // Всё готово — копируем в видимый canvas одним синхронным drawImage (без мигания)
      const canvas = canvasRef.current!;
      canvas.width = offscreen.width;
      canvas.height = offscreen.height;
      canvas.style.width = `${scaledViewport.width}px`;
      canvas.style.height = `${scaledViewport.height}px`;
      canvas.getContext("2d")!.drawImage(offscreen, 0, 0);
    })();

    return () => {
      cancelled = true;
      try { renderTaskRef.current?.cancel(); } catch (_) {}
    };
  }, [pdfDoc, pageNum, targetHeight]);

  const borderRadius = isSingle
    ? "6px"
    : isLeft
      ? "6px 0 0 6px"
      : "0 6px 6px 0";

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", borderRadius }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export const SwipeBookViewer = forwardRef<SwipeBookViewerHandle, SwipeBookViewerProps>(
  ({ pdfUrl, pdfData, height, contentRanges = [], onTap, onPageChange }, ref) => {
    const onPageChangeRef = useRef(onPageChange);
    useEffect(() => { onPageChangeRef.current = onPageChange; }, [onPageChange]);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobile, setIsMobile] = useState(() =>
      typeof window !== "undefined" && window.innerWidth < 1024
    );

    // live refs so handlers don't go stale
    const currentPageRef = useRef(1);
    const numPagesRef = useRef(0);
    const isMobileRef = useRef(
      typeof window !== "undefined" && window.innerWidth < 1024
    );

    useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
    useEffect(() => { numPagesRef.current = numPages; }, [numPages]);

    // Detect mobile / resize
    useEffect(() => {
      const check = () => {
        const m = window.innerWidth < 1024;
        isMobileRef.current = m;
        setIsMobile(m);
      };
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }, []);

    // Load PDF
    useEffect(() => {
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);
      setMobileIndex(0);
      mobileIndexRef.current = 0;
      let cancelled = false;

      (async () => {
        try {
          if (!("getOrInsertComputed" in Map.prototype)) {
            (Map.prototype as any).getOrInsertComputed = function(key: any, fn: (k: any) => any) {
              if (!this.has(key)) this.set(key, fn(key));
              return this.get(key);
            };
          }
          const pdfjsLib = await import("pdfjs-dist/build/pdf");
          (pdfjsLib as any).GlobalWorkerOptions.workerSrc = "/api/pdf-worker";

          // Если байты уже есть — не скачиваем повторно.
          // Копируем буфер через slice() — pdfjs передаёт его в Worker через transfer,
          // после чего оригинал становится detached и непригоден для повторного использования.
          const source = pdfData
            ? { data: pdfData.slice(0) }
            : { url: pdfUrl, isEvalSupported: false };
          const pdf = await (pdfjsLib as any).getDocument(source).promise;
          if (!cancelled) {
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            numPagesRef.current = pdf.numPages;
          }
        } catch (err) {
          console.error("[SwipeBookViewer] PDF load error:", err);
        }
      })();

      return () => { cancelled = true; };
    }, [pdfUrl, pdfData]);

    // Список реальных страниц для мобайла (без пустых/разделительных)
    // Строим из contentRanges: каждый диапазон [offset, offset+count)
    const mobilePages = useMemo<number[]>(() => {
      if (contentRanges.length === 0) return [];
      const pages: number[] = [];
      for (const { offset, count } of contentRanges) {
        for (let i = 0; i < count; i++) pages.push(offset + i);
      }
      return pages.sort((a, b) => a - b);
    }, [contentRanges]);

    const mobilePagesRef = useRef<number[]>([]);
    useEffect(() => { mobilePagesRef.current = mobilePages; }, [mobilePages]);

    // Индекс текущей страницы в списке мобильных страниц
    const [mobileIndex, setMobileIndex] = useState(0);
    const mobileIndexRef = useRef(0);
    useEffect(() => { mobileIndexRef.current = mobileIndex; }, [mobileIndex]);

    // Navigation — всегда ±1 страница (объявляем ДО useImperativeHandle чтобы избежать TDZ)
    const navigate = useCallback((dir: -1 | 1) => {
      // onPageChangeRef вызывается СНАРУЖИ setState — нельзя обновлять родительский
      // компонент (Page) изнутри функции-апдейтера дочернего компонента
      if (mobilePagesRef.current.length > 0) {
        const next = Math.max(0, Math.min(mobilePagesRef.current.length - 1, mobileIndexRef.current + dir));
        mobileIndexRef.current = next;
        currentPageRef.current = mobilePagesRef.current[next];
        setMobileIndex(next);
        onPageChangeRef.current?.(mobilePagesRef.current[next]);
      } else {
        const next = Math.max(1, Math.min(numPagesRef.current, currentPageRef.current + dir));
        currentPageRef.current = next;
        setCurrentPage(next);
        onPageChangeRef.current?.(next);
      }
    }, []);

    // Expose handle
    useImperativeHandle(ref, () => ({
      goToPage: (page: number) => {
        const clamped = Math.max(1, Math.min(numPagesRef.current || 999, page));
        if (mobilePagesRef.current.length > 0) {
          const pages = mobilePagesRef.current;
          const idx = pages.findIndex((p) => p >= clamped);
          const newIdx = idx === -1 ? pages.length - 1 : idx;
          setMobileIndex(newIdx);
          mobileIndexRef.current = newIdx;
          currentPageRef.current = pages[newIdx];
          onPageChangeRef.current?.(pages[newIdx]);
        } else {
          setCurrentPage(clamped);
          currentPageRef.current = clamped;
          onPageChangeRef.current?.(clamped);
        }
      },
      getActivePage: () => currentPageRef.current,
      navigateStep: (step: -1 | 1) => navigate(step),
    }), [navigate]);

    // ── Swipe via native touch events (надёжнее pointer events на iOS Safari) ─
    const containerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const onTapRef = useRef(onTap);
    useEffect(() => { onTapRef.current = onTap; }, [onTap]);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const onTouchStart = (e: TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      };

      const onTouchEnd = (e: TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        touchStartX.current = null;
        touchStartY.current = null;

        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          navigate(dx < 0 ? 1 : -1);
        } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          onTapRef.current?.();
        }
      };

      el.addEventListener("touchstart", onTouchStart, { passive: true });
      el.addEventListener("touchend", onTouchEnd, { passive: true });
      return () => {
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchend", onTouchEnd);
      };
    }, [navigate]);

    // ── Mouse events for desktop ──────────────────────────────────────────────
    const mouseStartX = useRef<number | null>(null);
    const mouseStartY = useRef<number | null>(null);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const onMouseDown = (e: MouseEvent) => {
        mouseStartX.current = e.clientX;
        mouseStartY.current = e.clientY;
      };

      const onMouseUp = (e: MouseEvent) => {
        if (mouseStartX.current === null || mouseStartY.current === null) return;
        const dx = e.clientX - mouseStartX.current;
        const dy = e.clientY - mouseStartY.current;
        mouseStartX.current = null;
        mouseStartY.current = null;

        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
          navigate(dx < 0 ? 1 : -1);
        } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
          onTapRef.current?.();
        }
      };

      el.addEventListener("mousedown", onMouseDown);
      el.addEventListener("mouseup", onMouseUp);
      return () => {
        el.removeEventListener("mousedown", onMouseDown);
        el.removeEventListener("mouseup", onMouseUp);
      };
    }, [navigate]);

    // Всегда одна страница
    const pagesToShow = mobilePages.length > 0
      ? [mobilePages[mobileIndex]]
      : [currentPage];

    // Target page height: 97% of container height
    const pageHeight = Math.floor(height * 0.97);

    return (
      <div
        ref={containerRef}
        style={{
          height,
          width: "100%",
          background: "#F7F4F1",
          overflow: "hidden",
          position: "relative",
          userSelect: "none",
          touchAction: "none",
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Spread wrapper — pointer-events:none чтобы касания шли к контейнеру */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.28))",
            pointerEvents: "none",
          }}
        >
          {pdfDoc && pagesToShow.length > 0
            ? pagesToShow.map((pageNum, idx) => {
                const isOnly = pagesToShow.length === 1;
                const isLeft = !isOnly && idx === 0;
                const isRight = !isOnly && idx === pagesToShow.length - 1;
                return (
                  <div key={idx} style={{ position: "relative", display: "flex" }}>
                    <PdfPage
                      pdfDoc={pdfDoc}
                      pageNum={pageNum}
                      targetHeight={pageHeight}
                      isLeft={isLeft}
                      isRight={isRight}
                      isSingle={isOnly}
                    />
                    {isLeft && (
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          background:
                            "linear-gradient(to right, rgba(0,0,0,0.18), rgba(0,0,0,0.06))",
                          zIndex: 1,
                        }}
                      />
                    )}
                  </div>
                );
              })
            : <Skeleton
                style={{
                  width: Math.floor(pageHeight * 0.707),
                  height: pageHeight,
                  borderRadius: "6px",
                }}
              />}
        </div>
      </div>
    );
  }
);

SwipeBookViewer.displayName = "SwipeBookViewer";
