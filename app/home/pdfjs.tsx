"use client";

import React, { useEffect, useRef, useState } from "react";
import { getPdfDocument, getPdfDocumentFromData } from "@/lib/pdf-doc-cache";
import { queuePageRender, isBottomDrawn } from "@/lib/pdf-render-queue";
import { watchResume } from "@/lib/measure-on-resume";


interface PdfViewerProps {
  fileUrl: string | File;
  pageNum: number;
  setPdfDoc?: (doc: any) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

export default function Pdfjs({ fileUrl, pageNum, setPdfDoc, onLoadStart, onLoadEnd }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const setPdfDocRef = useRef(setPdfDoc);
  const onLoadStartRef = useRef(onLoadStart);
  const onLoadEndRef = useRef(onLoadEnd);
  const [pdfDoc, setPdfDocState] = useState<any>(null);
  const [scale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [docFailed, setDocFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPdfDocRef.current = setPdfDoc;
    onLoadStartRef.current = onLoadStart;
    onLoadEndRef.current = onLoadEnd;
  }, [onLoadEnd, onLoadStart, setPdfDoc]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;
    setDocFailed(false);

    const loadPdf = async () => {
      try {
        // Документ берётся из общего кэша: один файл разбирается один раз,
        // сколько бы карточек страниц его ни показывали
        const pdf =
          typeof fileUrl === "string"
            ? await getPdfDocument(fileUrl)
            : await getPdfDocumentFromData(
                `file:${fileUrl.name}:${fileUrl.size}:${fileUrl.lastModified}`,
                await fileUrl.arrayBuffer(),
              );

        if (!isMounted) return;

        setPdfDocState(pdf);
        setPdfDocRef.current?.(pdf);
      } catch (err) {
        console.error("Ошибка при загрузке PDF:", err);
        if (isMounted) setDocFailed(true);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      // Документ живёт в общем кэше и переиспользуется — не сбрасываем его,
      // иначе возврат к той же песне заставит ждать заново
    };
  }, [fileUrl]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    /**
     * Ширину применяем не сразу, а когда она перестала меняться.
     *
     * При возврате из свёрнутого состояния на iPad подряд может прилететь
     * несколько разных значений: сначала то, что было в момент сворачивания
     * (уменьшенная карточка в переключателе задач), затем настоящее. Без
     * задержки каждое такое значение перерисовывало canvas — на глаз это
     * видно как дёрганье страницы, для нот на пульте недопустимое.
     *
     * Отдельно — та же причина, по которой размер иногда застревал неверным
     * до следующего реального изменения (и чинилось только повторным
     * сворачиванием): ResizeObserver один раз промахивался мимо настоящего
     * значения, и обновить было уже нечем. Слушаем ещё и возврат видимости
     * напрямую через layout — не полагаясь только на ResizeObserver.
     */
    let settleTimer: number | null = null;
    let lastWidth = 0;
    // Применённое значение — отдельно от lastWidth (последнее УВИДЕННОЕ):
    // по нему решаем, растёт ширина или падает
    let applied = 0;
    const commit = (w: number) => {
      if (w <= 0 || Math.abs(w - lastWidth) < 1) return;
      lastWidth = w;
      if (settleTimer) window.clearTimeout(settleTimer);
      /**
       * Уменьшение ждёт дольше, чем увеличение.
       *
       * Подтверждено телеметрией: жест "подсмотреть" Dock/переключатель
       * приложений на iPad на мгновение реально сжимает окно — но
       * visibilitychange при этом не срабатывает, приложение всё это время
       * считается видимым. Провал держался 578мс, чего хватало, чтобы
       * пройти прежний порог в 120мс и попасть на экран. Даём подозрительному
       * уменьшению больше времени на то, чтобы само себя отменить —
       * настоящее изменение (поворот экрана, реальный сплит-вью) от этого
       * не потеряется, просто применится на три четверти секунды позже.
       * Увеличение неопасно показать сразу: мелким от него ничего не станет
       */
      const delay = w < applied ? 900 : 120;
      settleTimer = window.setTimeout(() => {
        applied = w;
        setContainerWidth(w);
      }, delay);
    };

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) commit(w);
    });
    ro.observe(el);

    const remeasure = () => commit(el.getBoundingClientRect().width);
    // Один замер после возврата не гарантирует настоящую раскладку — редко,
    // но промахивается. watchResume повторяет его ещё несколько раз в
    // течение секунды, а не один
    const stopWatching = watchResume(remeasure);

    return () => {
      ro.disconnect();
      if (settleTimer) window.clearTimeout(settleTimer);
      stopWatching();
    };
  }, []);

  useEffect(() => {
    // Ни один выход отсюда не должен оставить скелетон висеть: документ мог не
    // открыться, а контейнер — ещё не измериться. Раньше загрузка снималась
    // только при удачной отрисовке, и страница с непрочитанным файлом
    // оставалась под серым прямоугольником навсегда
    if (!pdfDoc || !canvasRef.current || containerWidth === 0) {
      // Пока документ ещё грузится, скелетон нужен — иначе будет пустая карточка
      if (docFailed) onLoadEndRef.current?.();
      return;
    }

    let renderTask: any = null;

    const renderPage = async (num: number, userScale: number) => {
      try {
        setRenderError(null);
        onLoadStartRef.current?.();

        if (num < 1 || num > pdfDoc.numPages) {
          console.warn(`[Pdfjs] pageNum ${num} out of range [1, ${pdfDoc.numPages}] — skipping render`);
          return;
        }

        const page = await pdfDoc.getPage(num);
        const rotation = page.rotate || 0;
        const base = page.getViewport({ scale: 1, rotation });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const baseScale = (containerWidth / base.width) * userScale;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.floor(containerWidth * outputScale);
        canvas.height = Math.floor(base.height * baseScale * outputScale);
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.scale(outputScale, outputScale);

        await queuePageRender(`${pdfDoc.fingerprints?.[0] ?? "doc"}#${num}`, async () => {
          // Заливка белым и проверка нижней строки: страница, нарисованная
          // наполовину, не должна остаться на экране. Подробности — в
          // pdf-render-queue.ts
          for (let attempt = 0; attempt < 3; attempt++) {
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

            renderTask = page.render({
              canvasContext: context,
              viewport: page.getViewport({ scale: baseScale, rotation }),
            });
            await renderTask.promise;

            if (isBottomDrawn(canvas)) return;

            // Список команд рисования, разобранный с обрывом, остаётся в
            // объекте страницы и проигрывается снова при каждой следующей
            // отрисовке — потому обрезанная страница и держалась до перезапуска
            // приложения. cleanup() выбрасывает его, и разбор идёт заново
            try { page.cleanup(); } catch {}
          }
        });
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Ошибка при рендеринге страницы PDF:", err);
          setRenderError(`${err?.name}: ${err?.message}`);
        }
      } finally {
        // Без проверки на актуальность эффекта: при быстром листании он
        // успевает смениться, и страница осталась бы в загрузке навсегда
        onLoadEndRef.current?.();
      }
    };

    renderPage(pageNum, scale);

    return () => {
      try { renderTask?.cancel(); } catch {}
    };
  }, [containerWidth, pageNum, pdfDoc, scale, docFailed]);

  /**
   * ВРЕМЕННО: строка с настоящими размерами для разбора "маленьких нот".
   * Убрать, когда причина будет окончательно подтверждена на практике.
   *
   * Смотрим одновременно на окно, коробку и холст: если ноты снова станут
   * маленькими, числа сразу покажут, где расхождение — коробка не с экран,
   * задано меньше, чем коробка, или холст не совпадает с заданным
   */
  const [debugLine, setDebugLine] = useState("");
  useEffect(() => {
    const tick = () => {
      const box = containerRef.current?.getBoundingClientRect();
      const canvas = canvasRef.current;
      const vv = window.visualViewport;
      setDebugLine(
        [
          `окно ${window.innerWidth}`,
          vv ? `видимое ${Math.round(vv.width)}` : "",
          box ? `коробка ${Math.round(box.width)}` : "коробка —",
          canvas ? `холст ${Math.round(canvas.getBoundingClientRect().width)}/${canvas.width}px` : "холст —",
          `задано ${containerWidth}`,
          `dpr ${window.devicePixelRatio}`,
        ]
          .filter(Boolean)
          .join(" · "),
      );
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [containerWidth]);

  return (
    <div
      ref={containerRef}
      style={{
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
        }}
      />
      {renderError && (
        <div style={{
          position: "absolute", top: 8, left: 8, right: 8,
          background: "rgba(200,0,0,0.85)", color: "#fff",
          borderRadius: 8, padding: "8px 12px", fontSize: 12,
          wordBreak: "break-all", zIndex: 10,
        }}>
          {renderError}
        </div>
      )}

      {/* ВРЕМЕННО: числа для разбора "маленьких нот", убрать после проверки */}
      <div
        style={{
          position: "absolute",
          left: 4,
          bottom: 4,
          zIndex: 5,
          font: "11px ui-monospace, monospace",
          color: "#111",
          background: "rgba(255,255,255,0.85)",
          padding: "2px 5px",
          borderRadius: 4,
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {debugLine}
      </div>
    </div>
  );
}
