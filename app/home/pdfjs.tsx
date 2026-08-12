"use client";

import React, { useEffect, useRef, useState } from "react";
import { getPdfDocument, getPdfDocumentFromData } from "@/lib/pdf-doc-cache";
import { queuePageRender } from "@/lib/pdf-render-queue";


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
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
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
          renderTask = page.render({
            canvasContext: context,
            viewport: page.getViewport({ scale: baseScale, rotation }),
          });
          await renderTask.promise;
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
    </div>
  );
}
