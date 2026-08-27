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
import { queuePageRender, isBottomDrawn } from "@/lib/pdf-render-queue";
import { watchResume } from "@/lib/measure-on-resume";
import { logDiag } from "@/lib/viewer-diag";
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

/**
 * Страницы, у которых отрисовку оборвали на середине.
 *
 * pdf.js кэширует в объекте страницы список команд рисования. Если разбор
 * прервать, в кэше остаётся его обрывок, и он проигрывается при каждой
 * следующей отрисовке — лист выходит обрезанным и сам уже не чинится.
 * Выбрасывает обрывок cleanup(), но он молча откладывается, пока у страницы
 * есть незавершённые отрисовки, — то есть сразу после cancel() он бесполезен.
 * Поэтому страница лишь помечается здесь, а убирается в начале следующей
 * отрисовки: очередь к тому моменту уже дождалась завершения предыдущей.
 */
const pagesNeedingReparse = new WeakSet<object>();

/**
 * Освобождает память под холстами.
 *
 * У Safari на iOS предел памяти под холсты один на весь процесс приложения.
 * Убрать холст из DOM недостаточно: его буфер держится до сборки мусора и всё
 * это время занимает общий предел. Когда предел исчерпан, Safari не падает, а
 * молча отдаёт недорисованные холсты — лист выходит обрезанным, и чинит это
 * только перезапуск приложения, потому что пул обнуляется вместе с процессом.
 *
 * Обнуление размеров освобождает буфер сразу же. Особенно это важно при
 * отменённых отрисовках: их полосы не попадают на экран вовсе и утекли бы
 * целиком, а смена сети вызывает как раз шквал перерисовок с отменами.
 */
function releaseCanvases(canvases: ArrayLike<HTMLCanvasElement>) {
  // Array.from, а не перебор напрямую: сюда приходит и обычный массив, и
  // выборка из разметки, а её перебор требует настроек сборки, которых
  // в проекте нет
  Array.from(canvases).forEach((canvas) => {
    canvas.width = 0;
    canvas.height = 0;
  });
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
  const containerRef = useRef<HTMLDivElement>(null);
  const isDoc = page.kind === "doc";
  const docKey = isDoc ? page.url : "";
  const pageInDoc = isDoc ? page.pageInDoc : 0;

  useEffect(() => {
    if (!isDoc || !containerRef.current) return;
    let cancelled = false;

    let renderTask: any = null;
    // Нужна в очистке эффекта, чтобы пометить страницу с оборванным разбором
    let activePage: any = null;

    (async () => {
      try {
        const doc = await getPdfDocument(docKey);
        if (cancelled) return;

        const pdfPage = await doc.getPage(pageInDoc);
        activePage = pdfPage;
        if (cancelled) return;

        const base = pdfPage.getViewport({ scale: 1 });
        const scaleByHeight = targetHeight / base.height;
        const scaleByWidth = maxWidth ? maxWidth / base.width : Infinity;
        const viewport = pdfPage.getViewport({
          scale: Math.min(scaleByHeight, scaleByWidth),
        });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Свежий замер обёртки книги прямо сейчас — сверить с тем, что
        // реально ушло в targetHeight (см. lib/viewer-diag.ts вверху файла)
        const bookLive = document.querySelector<HTMLElement>("[data-book-viewport]");
        logDiag("book:render", {
          targetHeight,
          liveHeight: bookLive?.getBoundingClientRect().height ?? null,
          pageInDoc,
        });

        await queuePageRender(`${docKey}#${pageInDoc}`, async () => {
          if (cancelled) return;

          // Очередь дождалась предыдущей отрисовки этой же страницы, поэтому
          // здесь cleanup() не откладывается и обрывок разбора действительно
          // выбрасывается — см. pagesNeedingReparse
          if (pagesNeedingReparse.has(pdfPage)) {
            pagesNeedingReparse.delete(pdfPage);
            try { pdfPage.cleanup(); } catch {}
          }

          /**
           * Страница рисуется одним холстом за один вызов отрисовки.
           *
           * Раньше она собиралась из горизонтальных полос, и каждая полоса была
           * отдельным вызовом render() по одному и тому же объекту страницы.
           * На планшете часть полос возвращалась пустой: сверху ноты, ниже —
           * белое поле, обрыв ровно по границе полосы. Держалось до перезапуска
           * приложения. Один вызов на страницу такой возможности не оставляет:
           * либо страница нарисована, либо нет. Так же рисует и обычная читалка
           * (app/home/pdfjs.tsx), где этой беды никогда и не было.
           *
           * По памяти это безопасно: на экране всегда ровно одна страница, а
           * её холст освобождается сразу, как только она уходит.
           */
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.display = "block";
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          const ctx = canvas.getContext("2d")!;

          for (let attempt = 0; attempt < 3; attempt++) {
            if (cancelled) {
              releaseCanvases([canvas]);
              return;
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            renderTask = pdfPage.render({
              canvasContext: ctx,
              viewport,
              transform: [dpr, 0, 0, dpr, 0, 0],
            });
            await renderTask.promise;
            if (cancelled) {
              releaseCanvases([canvas]);
              return;
            }

            // Холст залит непрозрачным белым, поэтому прозрачные пиксели внизу
            // означают, что память под него выделилась не полностью
            if (isBottomDrawn(canvas)) break;
            try { pdfPage.cleanup(); } catch {}
          }

          const container = containerRef.current;
          if (!container) {
            releaseCanvases([canvas]);
            return;
          }
          // Холст предыдущей страницы уходит с экрана — освобождаем его сразу,
          // не дожидаясь сборки мусора, иначе предел памяти выедается листанием
          releaseCanvases(container.querySelectorAll("canvas"));
          container.style.width = `${viewport.width}px`;
          container.style.height = `${viewport.height}px`;
          container.replaceChildren(canvas);
        });
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") console.error(err);
      }
    })();

    return () => {
      cancelled = true;
      // Отрисовку прерываем на полуслове, поэтому в объекте страницы остаётся
      // обрывок разбора. Убрать его прямо здесь нельзя — cleanup() отложится,
      // пока отмена не завершится, — поэтому страницу лишь помечаем, а уборка
      // произойдёт в начале следующей отрисовки
      if (renderTask && activePage) pagesNeedingReparse.add(activePage);
      try { renderTask?.cancel(); } catch {}
    };
  }, [isDoc, docKey, pageInDoc, targetHeight, maxWidth]);

  // Отдельно от отрисовки: при перерисовке полосы заменяются на месте, а вот
  // при уходе страницы с экрана их память надо вернуть, не дожидаясь сборки мусора
  useEffect(() => {
    const node = containerRef.current;
    return () => {
      if (node) releaseCanvases(node.querySelectorAll("canvas"));
    };
  }, []);

  const borderRadius = isSingle
    ? "12px"
    : isLeft
      ? "12px 0 0 12px"
      : "0 12px 12px 0";

  // Пустые страницы и разделители раньше приходили страницами склеенного PDF.
  // Рисовать их разметкой и быстрее, и чётче
  if (!isDoc) {
    const isSection = page.kind === "section";
    // Пропорции A4 — те же, что у заглушек в склейке. Ограничение по ширине
    // учитывается так же, как у страниц документа, иначе на телефоне пустые
    // страницы и разделители оказывались шире соседних
    const widthByHeight = targetHeight * (595 / 842);
    const width = maxWidth ? Math.min(widthByHeight, maxWidth) : widthByHeight;
    const height = width * (842 / 595);

    return (
      <div
        style={{
          width,
          height,
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
    <div
      ref={containerRef}
      style={{ display: "block", borderRadius, overflow: "hidden", background: "#ffffff" }}
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
    const [viewportWidth, setViewportWidth] = useState(() =>
      typeof window !== "undefined" ? window.innerWidth : 0
    );

    // live refs so handlers don't go stale
    const currentPageRef = useRef(1);
    const numPagesRef = useRef(0);
    const isMobileRef = useRef(
      typeof window !== "undefined" && window.innerWidth < 1024
    );

    useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
    useEffect(() => { numPagesRef.current = numPages; }, [numPages]);

    /**
     * Высота — по замеру самой коробки просмотрщика.
     *
     * Свойству height доверять нельзя: оно приходит из window.innerHeight, а на
     * iOS после смены сети окно сообщает высоту всего экрана, когда места на
     * деле вдвое меньше (замерено на планшете: окно 1148, коробка 600). Страница
     * строилась по 1148 и не влезала — низ срезался, и держалось это до
     * перезапуска приложения.
     *
     * Здесь меряется тот самый узел, в котором страница и показывается, поэтому
     * размер страницы и место под неё разойтись уже не могут.
     */
    const [measuredHeight, setMeasuredHeight] = useState(0);
    useEffect(() => {
      const node = containerRef.current;
      if (!node) return;

      /**
       * Высоту применяем не сразу, а когда она перестала меняться.
       *
       * При возврате из свёрнутого состояния на iPad ResizeObserver может
       * подряд отдать несколько разных значений: сначала то, что было в
       * момент сворачивания (уменьшенная карточка в переключателе задач),
       * затем настоящее. Без задержки каждое значение перестраивало
       * страницу заново — на глаз это дёрганье и внезапное уменьшение нот
       * прямо во время репетиции, чего для партитуры на пульте быть не
       * должно. Держим только то, что устоялось хотя бы 120мс.
       */
      let settleTimer: number | null = null;
      let lastHeight = 0;
      const commit = (height: number) => {
        logDiag("book:measure", { height, lastHeight });
        if (height <= 0 || Math.abs(height - lastHeight) < 1) return;
        lastHeight = height;
        if (settleTimer) window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          logDiag("book:commit", { height });
          setMeasuredHeight(height);
        }, 120);
      };

      const update = () => commit(node.getBoundingClientRect().height);
      update();

      // Один замер после возврата не гарантирует настоящую раскладку —
      // редко, но промахивается. watchResume повторяет его ещё несколько
      // раз в течение секунды, а не один
      const stopWatching = watchResume(update);

      const observer = new ResizeObserver(update);
      observer.observe(node);
      window.addEventListener("resize", update);
      window.visualViewport?.addEventListener("resize", update);
      return () => {
        if (settleTimer) window.clearTimeout(settleTimer);
        stopWatching();
        observer.disconnect();
        window.removeEventListener("resize", update);
        window.visualViewport?.removeEventListener("resize", update);
      };
    }, []);

    // Detect mobile / resize
    useEffect(() => {
      const check = () => {
        const m = window.innerWidth < 1024;
        isMobileRef.current = m;
        setIsMobile(m);
        setViewportWidth(window.innerWidth);
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
    // Высота берётся с замера самой коробки, а не из свойства height.
    // Замер сделан по тому же узлу, в котором страница и показывается, поэтому
    // разойтись они не могут. Свойство остаётся запасным значением на первый
    // кадр, пока замер ещё не сделан
    const pageHeight = Math.floor((measuredHeight || height) * heightFactor);

    // Ограничение по ширине. Без него страница масштабировалась только по
    // высоте и на узком экране (телефон) вылезала за его края — нотный лист
    // был обрезан слева и справа. Там, где страница и так упирается в высоту
    // раньше, чем в ширину (планшет, ноутбук), это ограничение не действует:
    // в PdfPage берётся меньший из двух масштабов
    const pageMaxWidth = viewportWidth
      ? Math.floor((viewportWidth - 12) / pagesToShow.length)
      : undefined;

    return (
      <div
        ref={containerRef}
        style={{
          // Не height из свойства: оно приходит из окна, а окно на iOS завышает
          // высоту после смены сети. Коробка занимает то место, что есть на
          // самом деле, и по нему же меряется (см. measuredHeight)
          height: "100%",
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
                      maxWidth={pageMaxWidth}
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
