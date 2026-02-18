"use client";
import { useState, useCallback } from "react";
import { useSongContext } from "../SongContextProvider";

export const useDownloadSong = () => {
  const context = useSongContext();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    const song = context?.songResponse;
    if (!song?.doc?.file?.filename) return;

    setIsDownloading(true);
    try {
      const fileUrl = `http://localhost:4000/uploads/${song.doc.file.filename}`;
      const fileName = song.doc.file.originalName || `${song.doc.name}.pdf`;

      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Ошибка загрузки файла");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Ошибка при скачивании:", error);
      // Fallback: просто открываем файл в новом окне
      window.open(
        `http://localhost:4000/uploads/${song.doc.file.filename}`,
        "_blank"
      );
    } finally {
      setIsDownloading(false);
    }
  }, [context]);

  return {
    handleDownload,
    isDownloading,
    isEnabled: !!context?.songResponse?.doc?.file?.filename,
  };
};
