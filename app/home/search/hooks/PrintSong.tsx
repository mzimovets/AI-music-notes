"use client";
import { ServerSong } from "@/lib/types";
import { useRef, useState, useCallback } from "react";

export const usePrintSong = () => {
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const handlePrint = (song?: ServerSong) => {
    const filename = song?.file?.filename;

    if (!filename) return;

    if (iframeRef.current) {
      setIsLoading(true);

      const iframeEl = iframeRef.current;
      const printFilename = filename;

      // Печать выполняем на стороне дочерней страницы `/print/[filename]`,
      // чтобы не упираться в ограничения кросс-ориджного доступа к `contentWindow`.
      iframeEl.src = "";

      const onMessage = (event: MessageEvent) => {
        if (
          event.data?.type === "print:after" &&
          event.data?.filename === printFilename
        ) {
          setIsLoading(false);
          window.removeEventListener("message", onMessage);
        }
      };

      window.addEventListener("message", onMessage);
      const timeoutId = window.setTimeout(() => {
        setIsLoading(false);
        window.removeEventListener("message", onMessage);
      }, 12000);

      iframeEl.onload = () => {
        window.clearTimeout(timeoutId);
        window.removeEventListener("message", onMessage);
        setTimeout(() => setIsLoading(false), 1500);
      };

      console.log("iframeEl.src", `/print/${encodeURIComponent(filename)}`);
      iframeEl.src = `/print/${encodeURIComponent(filename)}`;
    }
  };

  return {
    handlePrint,
    isLoading,
    isEnabled: true,
    PrintElement: (
      <iframe
        ref={iframeRef}
        style={{
          position: "fixed",
          left: "-10000px",
          top: "0",
          width: "1px",
          height: "1px",
          border: 0,
          visibility: "visible",
        }}
        title="PDF Print Frame"
      />
    ),
  };
};
