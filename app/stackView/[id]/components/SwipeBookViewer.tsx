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
import { getPdfDocument } from "@/lib/pdf-doc-cache";
import { queuePageRender } from "@/lib/pdf-render-queue";
import type { PlanPage } from "@/lib/stack-page-plan";


// ─── Public handle (same interface as DearFlipViewerHandle) ──────────────────
export interface SwipeBookViewerHandle {
  goToPage: (page: number) => void;
  getActivePage: () => number;
  navigateStep: (step: -1 | 1) => void;
}

export interface SwipeBookViewerProps {
  /**
   * План страниц: какая страница какого документа где стоит. Раньше сюда
   * приходил один склеенный PDF, который сервер пересобирал на каждое
   * изменение стопки; теперь перестановка песни меняет только этот массив.
   */
  plan: PlanPage[];
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
  page,
  targetHeight,
  maxWidth,
  isLeft,
  isRight,
  isSingle,
}: {
  page: PlanPage;
  targetHeight: number;
  maxWidth?: number;
  isLeft?: boolean;
  isRight?: boolean;
  isSingle?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDoc = page.kind === "doc";
  const docKey = isDoc ? page.url : "";
  const pageInDoc = isDoc ? page.pageInDoc : 0;

  useEffect(() => {
    if (!isDoc || !canvasRef.current) return;
    let cancelled = false;

    const paint = (source: HTMLCanvasElement, cssWidth: number, cssHeight: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = source.width;
      canvas.height = source.height;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.getContext("2d")!.drawImage(source, 0, 0);
    };

    let renderTask: any = null;

    (async () => {
      try {
        const doc = await getPdfDocument(docKey);
        if (cancelled) return;

        const pdfPage = await doc.getPage(pageInDoc);
        if (cancelled) return;

        const base = pdfPage.getViewport({ scale: 1 });
        const scaleByHeight = targetHeight / base.height;
        const scaleByWidth = maxWidth ? maxWidth / base.width : Infinity;
        const viewport = pdfPage.getViewport({
          scale: Math.min(scaleByHeight, scaleByWidth),
        });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Рисуем в отдельный canvas, видимый не трогаем пока не готово
        const offscreen = document.createElement("canvas");
        offscreen.width = Math.floor(viewport.width * dpr);
        offscreen.height = Math.floor(viewport.height * dpr);
        const ctx = offscreen.getContext("2d")!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        await queuePageRender(`${docKey}#${pageInDoc}`, async () => {
          if (cancelled) return;
          renderTask = pdfPage.render({ canvasContext: ctx, viewport });
          await renderTask.promise;
          if (cancelled) return;

          paint(offscreen, viewport.width, viewport.height);
        });
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") console.error(err);
      }
    })();

    return () => {
      cancelled = true;
      try { renderTask?.cancel(); } catch {}
    };
  }, [isDoc, docKey, pageInDoc, targetHeight, maxWidth]);

  const borderRadius = isSingle
    ? "12px"
    : isLeft
      ? "12px 0 0 12px"
      : "0 12px 12px 0";

  // Пустые страницы и разделители раньше приходили страницами склеенного PDF.
  // Рисовать их разметкой и быстрее, и чётче
  if (!isDoc) {
    const isSection = page.kind === "section";
    // Пропорции A4 — те же, что у заглушек в склейке
    const width = targetHeight * (595 / 842);

    return (
      <div
        style={{
          width,
          height: targetHeight,
          borderRadius,
          background: isSection ? page.color : "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isSection && (
          <span
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: Math.round(targetHeight * 0.043),
              fontFamily: '"Roboto Slab", serif',
            }}
          >
            {page.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", borderRadius }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export const SwipeBookViewer = forwardRef<SwipeBookViewerHandle, SwipeBookViewerProps>(
  ({ plan, height, contentRanges = [], onTap, onPageChange }, ref) => {
    const onPageChangeRef = useRef(onPageChange);
    useEffect(() => { onPageChangeRef.current = onPageChange; }, [onPageChange]);
    
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

    // Длина книги — это длина плана. Ни загрузки, ни разбора здесь больше нет:
    // перестановка песни меняет массив, а текущая страница остаётся на месте
    useEffect(() => {
      setNumPages(plan.length);
      numPagesRef.current = plan.length;

      // Если страниц стало меньше, подтягиваем позицию внутрь новых границ
      setCurrentPage((prev) => Math.min(Math.max(prev, 1), plan.length || 1));
    }, [plan.length]);

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

    // Документы соседних страниц открываем заранее — это дёшево и безопасно.
    // Предварительной отрисовки здесь намеренно нет: она занимала главный
    // поток ровно в момент касания, из-за чего iOS гасил жесты
    useEffect(() => {
      if (plan.length === 0) return;

      const around = mobilePages.length > 0
        ? [mobilePages[mobileIndex + 1], mobilePages[mobileIndex - 1]]
            .filter((p): p is number => typeof p === "number")
        : [currentPage + 1, currentPage - 1];

      for (const pageNum of around) {
        const entry = plan[pageNum - 1];
        if (!entry || entry.kind !== "doc") continue;
        getPdfDocument(entry.url).catch(() => {});
      }
    }, [plan, mobilePages, mobileIndex, currentPage]);

    // Navigation — всегда ±1 страница (объявляем ДО useImperativeHandle чтобы избежать TDZ)
    const navigate = useCallback((dir: -1 | 1) => {
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

      // Если поток занят отрисовкой, iOS гасит жест и шлёт touchcancel.
      // Без сброса начальная точка оставалась от погашенного касания, и
      // следующий свайп считался от неё — палец приходилось вести дважды
      const onTouchCancel = () => {
        touchStartX.current = null;
        touchStartY.current = null;
      };

      el.addEventListener("touchstart", onTouchStart, { passive: true });
      el.addEventListener("touchend", onTouchEnd, { passive: true });
      el.addEventListener("touchcancel", onTouchCancel, { passive: true });
      return () => {
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchend", onTouchEnd);
        el.removeEventListener("touchcancel", onTouchCancel);
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

    // Target page height: на большом экране (iPad 13+) чуть меньше
    const heightFactor = !isMobile ? 0.98 : 0.98;
    const pageHeight = Math.floor(height * heightFactor);

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
          {plan.length > 0 && pagesToShow.length > 0
            ? pagesToShow.map((pageNum, idx) => {
                const isOnly = pagesToShow.length === 1;
                const isLeft = !isOnly && idx === 0;
                const isRight = !isOnly && idx === pagesToShow.length - 1;
                const planPage = plan[pageNum - 1];
                if (!planPage) return null;
                return (
                  <div key={idx} style={{ position: "relative", display: "flex" }}>
                    <PdfPage
                      page={planPage}
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
