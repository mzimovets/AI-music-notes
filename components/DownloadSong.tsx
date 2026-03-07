"use client";
import { useState, useCallback } from "react";
import { useSongContext } from "../app/song/[id]/SongContextProvider";

// Показывает центрированное сообщение с анимацией, размеры как при нажатии «Поделиться»
const showCenterMessage = () => {
  const container = document.createElement("div");
  container.className =
    "fixed inset-0 flex items-center justify-center z-50 pointer-events-none";
  container.innerHTML = `
            <div class="transition-transform duration-300 ease-out transform scale-0 opacity-0">
              <div class="p-10 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl flex flex-col items-center gap-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] min-w-[20rem]">
                <div class="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white">
                    <path d="M12.5535 16.5061C12.4114 16.6615 12.2106 16.75 12 16.75C11.7894 16.75 11.5886 16.6615 11.4465 16.5061L7.44648 12.1311C7.16698 11.8254 7.18822 11.351 7.49392 11.0715C7.79963 10.792 8.27402 10.8132 8.55352 11.1189L11.25 14.0682V3C11.25 2.58579 11.5858 2.25 12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V14.0682L15.4465 11.1189C15.726 10.8132 16.2004 10.792 16.5061 11.0715C16.8118 11.351 16.833 11.8254 16.5535 12.1311L12.5535 16.5061Z" fill="currentColor"/>
                    <path d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z" fill="currentColor"/>
                  </svg>
                </div>
                <span class="input-header text-lg text-gray-900">Файл скачан</span>
              </div>
            </div>
          `;
  document.body.appendChild(container);

  const innerDiv = container.firstElementChild;

  requestAnimationFrame(() => {
    innerDiv.classList.remove("scale-0", "opacity-0");
    innerDiv.classList.add("scale-100", "opacity-100");
  });

  setTimeout(() => {
    innerDiv.classList.remove("scale-100", "opacity-100");
    innerDiv.classList.add("scale-0", "opacity-0");
    innerDiv.addEventListener("transitionend", () => container.remove(), {
      once: true,
    });
  }, 2500);
};

export const useDownloadSong = () => {
  const context = useSongContext();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(
    async (manualSong = null) => {
      const song = manualSong || context?.songResponse;
      if (!song?.doc?.file?.filename && !manualSong) return;

      setIsDownloading(true);
      try {
        const fileUrl = `http://localhost:4000/uploads/${song?.doc?.file?.filename || manualSong?.file?.filename}`;
        const fileName =
          manualSong?.file.filename ||
          song?.doc?.file?.originalName ||
          `${song.doc.name}.pdf`;

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
        showCenterMessage();
      } catch (error) {
        console.error("Ошибка при скачивании:", error);
        window.open(
          `http://localhost:4000/uploads/${song?.doc?.file?.filename || manualSong?.file?.filename}`,
          "_blank",
        );
        showCenterMessage();
      } finally {
        setIsDownloading(false);
      }
    },
    [context],
  );

  return {
    handleDownload,
    isDownloading,
    isEnabled: !!context?.songResponse?.doc?.file?.filename,
  };
};
