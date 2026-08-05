"use client";

import React, { useEffect, useRef, useState } from "react";
import { getPdfDocument, getPdfDocumentFromData } from "@/lib/pdf-doc-cache";
import { getRenderedPage, prefetchPages } from "@/lib/pdf-page-cache";

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
  const [aspect, setAspect] = useState<number | null>(null);
  // По умолчанию рисуем. Наблюдатель ниже сработает почти сразу и отметит
  // страницы, которые далеко, — а вот обратный порядок оставлял вечный
  // скелетон везде, где наблюдатель почему-либо не сработал
  const [isNearViewport, setIsNearViewport] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Тот же ключ, под которым документ лежит в кэше документов
  const docKey =
    typeof fileUrl === "string"
      ? fileUrl
      : `file:${fileUrl.name}:${fileUrl.size}:${fileUrl.lastModified}`;

  useEffect(() => {
    setPdfDocRef.current = setPdfDoc;
    onLoadStartRef.current = onLoadStart;
    onLoadEndRef.current = onLoadEnd;
  }, [onLoadEnd, onLoadStart, setPdfDoc]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

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

  // Соотношение сторон нужно до отрисовки: иначе все карточки стопки имеют
  // нулевую высоту, наблюдатель видит их все разом и рисует всё сразу
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await pdfDoc.getPage(
          Math.min(Math.max(pageNum, 1), pdfDoc.numPages),
        );
        const v = page.getViewport({ scale: 1, rotation: page.rotate || 0 });
        if (!cancelled) setAspect(v.width / v.height);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum]);

  // Рисуем только то, что рядом с экраном. В стопке из пятнадцати песен
  // страниц под полсотни — рисовать их все значит съесть память и уронить вкладку
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        setIsNearViewport(visible);

        // Ушли далеко — отпускаем пиксели canvas'а. Картинка страницы
        // останется в кэше, поэтому возврат назад будет мгновенным
        if (!visible && canvasRef.current) {
          canvasRef.current.width = 0;
          canvasRef.current.height = 0;
        }
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!pdfDoc) return;

    if (!canvasRef.current) return;

    if (containerWidth === 0) return;

    // Далеко от экрана — не рисуем, но и скелетон не оставляем висеть
    if (!isNearViewport) {
      onLoadEndRef.current?.();
      return;
    }

    let isActive = true;

    const paint = (bitmap: ImageBitmap) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    };

    const renderPage = async (num: number, userScale: number) => {
      try {
        setRenderError(null);
        if (num < 1 || num > pdfDoc.numPages) {
          console.warn(`[Pdfjs] pageNum ${num} out of range [1, ${pdfDoc.numPages}] — skipping render`);
          return;
        }

        const width = containerWidth * userScale;
        const result = getRenderedPage(pdfDoc, docKey, num, width);

        // Готовая страница рисуется сразу — без скелетона и лишнего кадра
        if (!(result instanceof Promise)) {
          paint(result);
          onLoadEndRef.current?.();
          return;
        }

        onLoadStartRef.current?.();
        const bitmap = await result;
        if (!isActive || !bitmap) return;
        paint(bitmap);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Ошибка при рендеринге страницы PDF:", err);
          setRenderError(`${err?.name}: ${err?.message}`);
        }
      } finally {
        if (isActive) {
          onLoadEndRef.current?.();
        }
      }
    };

    renderPage(pageNum, scale);

    // Соседние страницы — чтобы перелистывание в карточке песни было мгновенным
    prefetchPages(
      pdfDoc,
      docKey,
      [pageNum + 1, pageNum - 1, pageNum + 2],
      () => containerWidth * scale,
    );

    return () => {
      isActive = false;
    };
  }, [containerWidth, pageNum, pdfDoc, scale, docKey, isNearViewport]);

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
          // Место под страницу резервируется до отрисовки, чтобы список
          // не схлопывался и не дёргался, когда страницы появляются
          aspectRatio: aspect ? `${aspect}` : undefined,
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
