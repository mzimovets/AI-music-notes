"use client";

import React, { useEffect, useRef, useState } from "react";

interface PdfViewerProps {
  fileUrl: string | File;
  pageNum: number;
  setPdfDoc?: (doc: any) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

export default function Pdfjs({ fileUrl, pageNum, setPdfDoc, onLoadStart, onLoadEnd }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const setPdfDocRef = useRef(setPdfDoc);
  const onLoadStartRef = useRef(onLoadStart);
  const onLoadEndRef = useRef(onLoadEnd);
  const [pdfDoc, setPdfDocState] = useState<any>(null);
  const [scale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
        const pdfjsLib = await import("pdfjs-dist/build/pdf");
        await import("pdfjs-dist/build/pdf.worker.mjs");

        (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        let loadingTask;
        if (typeof fileUrl === "string") {
          loadingTask = (pdfjsLib as any).getDocument(fileUrl);
        } else {
          const arrayBuffer = await fileUrl.arrayBuffer();

          loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer });
        }

        const pdf = await loadingTask.promise;

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
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      setPdfDocState(null);
    };
  }, [fileUrl]);

  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateContainerWidth();
    window.addEventListener("resize", updateContainerWidth);
    return () => window.removeEventListener("resize", updateContainerWidth);
  }, []);

  useEffect(() => {
    if (!pdfDoc) return;

    if (!canvasRef.current) return;

    if (containerWidth === 0) return;

    let isActive = true;

    const renderPage = async (num: number, userScale: number) => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      try {
        onLoadStartRef.current?.();
        const page = await pdfDoc.getPage(num);

        const rotation = page.rotate || 0;
        const viewport = page.getViewport({ scale: 1, rotation });

        // Calculate scale to fit container width (fitScale)
        const fitScale = containerWidth / viewport.width;

        // Combine fitScale and userScale for zooming
        const baseScale = fitScale * userScale;

        const outputScale = window.devicePixelRatio || 1;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        // Set canvas width to container width * outputScale for high DPI
        canvas.width = Math.floor(containerWidth * outputScale);

        // Set canvas height to maintain aspect ratio
        canvas.height = Math.floor(viewport.height * baseScale * outputScale);

        // Set CSS width to 100% to fill container width, height auto to maintain aspect ratio
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        // Reset transform before scaling
        context.setTransform(1, 0, 0, 1, 0, 0);
        // Scale context to account for outputScale
        context.scale(outputScale, outputScale);

        const renderContext = {
          canvasContext: context,
          viewport: page.getViewport({ scale: baseScale, rotation }),
        };

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Ошибка при рендеринге страницы PDF:", err);
        }
      } finally {
        if (isActive) {
          onLoadEndRef.current?.();
        }
      }
    };

    renderPage(pageNum, scale);

    return () => {
      isActive = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [containerWidth, pageNum, pdfDoc, scale]);

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
        overflow: "auto",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          width: "100%",
          boxSizing: "border-box",
          overflow: "auto",
        }}
      />
    </div>
  );
}
