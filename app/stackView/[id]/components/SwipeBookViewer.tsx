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

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(scaledViewport.width * dpr);
      canvas.height = Math.floor(scaledViewport.height * dpr);
      canvas.style.width = `${scaledViewport.width}px`;
      canvas.style.height = `${scaledViewport.height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      renderTaskRef.current = page.render({ canvasContext: ctx, viewport: scaledViewport });
      try {
        await renderTaskRef.current.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") console.error(err);
      }
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
  ({ pdfUrl, pdfData, height, contentRanges = [], onTap }, ref) => {
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
      let cancelled = false;

      (async () => {
        try {
          const pdfjsLib = await import("pdfjs-dist/build/pdf");
          (pdfjsLib as any).GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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
    }, [pdfUrl]);

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

    // Expose handle
    useImperativeHandle(ref, () => ({
      goToPage: (page: number) => {
        const clamped = Math.max(1, Math.min(numPagesRef.current || 999, page));
        if (mobilePagesRef.current.length > 0) {
          // Найти ближайшую реальную страницу
          const pages = mobilePagesRef.current;
          const idx = pages.findIndex((p) => p >= clamped);
          const newIdx = idx === -1 ? pages.length - 1 : idx;
          setMobileIndex(newIdx);
          mobileIndexRef.current = newIdx;
          currentPageRef.current = pages[newIdx];
        } else {
          setCurrentPage(clamped);
          currentPageRef.current = clamped;
        }
      },
      getActivePage: () => currentPageRef.current,
    }), []);

    // Navigation — всегда ±1 страница
    const navigate = useCallback((dir: -1 | 1) => {
      if (mobilePagesRef.current.length > 0) {
        setMobileIndex((i) => {
          const next = Math.max(0, Math.min(mobilePagesRef.current.length - 1, i + dir));
          mobileIndexRef.current = next;
          currentPageRef.current = mobilePagesRef.current[next];
          return next;
        });
      } else {
        setCurrentPage((p) => Math.max(1, Math.min(numPagesRef.current, p + dir)));
      }
    }, []);

    // ── Swipe / drag ────────────────────────────────────────────────────────
    const dragStartX = useRef<number | null>(null);
    const [dragOffset] = useState(0);
    const dragging = useRef(false);

    const onPointerDown = (e: React.PointerEvent) => {
      dragging.current = true;
      dragStartX.current = e.clientX;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (_e: React.PointerEvent) => {};

    const onPointerUp = (e: React.PointerEvent) => {
      if (!dragging.current || dragStartX.current === null) return;
      dragging.current = false;
      const delta = e.clientX - dragStartX.current;
      dragStartX.current = null;
      if (Math.abs(delta) > 40) {
        navigate(delta < 0 ? 1 : -1);
      } else {
        onTap?.();
      }
    };

    const onPointerCancel = () => {
      dragging.current = false;
      dragStartX.current = null;
    };

    // Всегда одна страница
    const pagesToShow = mobilePages.length > 0
      ? [mobilePages[mobileIndex]]
      : [currentPage];

    // Target page height: 97% of container height
    const pageHeight = Math.floor(height * 0.97);

    return (
      <div
        style={{
          height,
          background: "#F7F4F1",
          overflow: "hidden",
          position: "relative",
          userSelect: "none",
          touchAction: "pan-y",
          cursor: dragging.current ? "grabbing" : "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerCancel}
        onPointerCancel={onPointerCancel}
      >
        {/* Spread wrapper — animates as one block */}
        <div
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: dragging.current ? "none" : "transform 0.25s ease",
            display: "flex",
            alignItems: "center",
            // Book shadow: left/right outer + center spine
            filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.28))",
          }}
        >
          {pdfDoc && pagesToShow.length > 0
            ? pagesToShow.map((pageNum, idx) => {
                const isOnly = pagesToShow.length === 1;
                const isLeft = !isOnly && idx === 0;
                const isRight = !isOnly && idx === pagesToShow.length - 1;
                return (
                  <div key={pageNum} style={{ position: "relative", display: "flex" }}>
                    <PdfPage
                      pdfDoc={pdfDoc}
                      pageNum={pageNum}
                      targetHeight={pageHeight}
                      isLeft={isLeft}
                      isRight={isRight}
                      isSingle={isOnly}
                    />
                    {/* Spine line between pages */}
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
            : // Loading placeholder
              <Skeleton
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
