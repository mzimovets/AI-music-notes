"use client";
import { ServerSong } from "@/lib/types";
import { useRef, useState, useCallback } from "react";

export const usePrintSong = () => {
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef(null);

  const handlePrint = (song?: ServerSong) => {
    const filename = song?.file?.filename;

    if (!filename) return;

    const fileUrl = `/uploads/${filename}`;

    if (iframeRef.current) {
      setIsLoading(true);

      // Сбрасываем src для корректного срабатывания onload при повторном нажатии
      iframeRef.current.src = "";

      iframeRef.current.onload = () => {
        try {
          const iframeWindow = iframeRef.current.contentWindow;
          if (iframeWindow) {
            iframeWindow.focus();
            iframeWindow.print();
          }
        } catch (error) {
          console.error("Ошибка печати:", error);
          alert("Ошибка доступа к печати (CORS). Проверьте настройки сервера.");
        } finally {
          setIsLoading(false);
        }
      };

      iframeRef.current.src = fileUrl;
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
          position: "absolute",
          width: 0,
          height: 0,
          border: 0,
          visibility: "hidden",
        }}
        title="PDF Print Frame"
      />
    ),
  };
};
