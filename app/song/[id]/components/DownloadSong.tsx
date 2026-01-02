"use client";

import DownloadIcon from "@/components/DownloadIcon";
import { useSongContext } from "../SongContextProvider";
import { useState } from "react";

export const DownloadSong = () => {
  const context = useSongContext();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!context) {
    return (
      <button
        className="opacity-50 cursor-not-allowed transition-opacity duration-300"
        disabled
      >
        <DownloadIcon width={34} height={34} />
      </button>
    );
  }

  const song = context.songResponse;

  if (!song?.doc?.file?.filename) {
    return (
      <button
        className="opacity-50 cursor-not-allowed transition-opacity duration-300"
        title="Файл недоступен для скачивания"
        disabled
      >
        <DownloadIcon width={34} height={34} />
      </button>
    );
  }

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const fileUrl = `http://localhost:4000/uploads/${song.doc.file.filename}`;
      const fileName =
        song.doc.file.originalName ||
        song.doc.file.filename ||
        `${song.doc.name}.pdf`;

      const response = await fetch(fileUrl);
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
      window.open(
        `http://localhost:4000/uploads/${song.doc.file.filename}`,
        "_blank"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`hover:opacity-100 transition-opacity duration-300 group hover:scale-110 transition-transform ${
        isDownloading ? "opacity-50 cursor-wait" : ""
      }`}
      title={`Скачать ${song.doc.name}`}
    >
      <DownloadIcon width={34} height={34} />
    </button>
  );
};
