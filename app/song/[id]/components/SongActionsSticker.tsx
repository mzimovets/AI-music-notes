"use client";
import { useSongContext } from "../SongContextProvider";
import { useShareSong } from "../../../../components/ShareSong";
import { useDownloadSong } from "../../../../components/DownloadSong";
import { usePrintSong } from "@/components/PrintSong";
import ShareIcon from "@/components/ShareIcon";
import PrinterIcon from "@/components/PrinterIcon";
import DownloadIcon from "@/components/DownloadIcon";
import { WidgetIcon } from "@/components/WidgetIcon";
import { CloseIcon } from "@/app/stackView/[id]/components/icon/CloseIcon";
import { useEffect, useState } from "react";

export const SongActionsSticker = () => {
  const context = useSongContext();
  const { handleShare } = useShareSong();
  const { handleDownload, isDownloading } = useDownloadSong();
  const { handlePrint, isLoading: isPrinting, PrintElement } = usePrintSong();

  const isReady = !!context?.songResponse;

  /**
   * На телефоне панель свёрнута в кнопку.
   *
   * Полоса в двести двадцать пикселей высотой занимала там пятую часть экрана
   * и закрывала ноты. Теперь у края висит небольшая кнопка, а по нажатию на её
   * месте разворачивается та же панель с крестиком сверху.
   *
   * На широких экранах панель как была — там места достаточно.
   */
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (isMobile && !open) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          aria-label="Действия с нотой"
          style={{
            width: 44,
            height: 44,
            borderRadius: "12px 0 0 12px",
            background: "linear-gradient(to right, #BD9673, #7D5E42)",
            boxShadow: "-2px 3px 6px rgba(0,0,0,0.25)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
          className="active:opacity-70 transition-opacity"
        >
          <WidgetIcon className="w-5 h-5" />
        </button>
        {PrintElement}
      </>
    );
  }

  return (
    <>
      <div
        style={{
          width: 60,
          height: 220,
          borderRadius: "16px 0 0 16px",
          background: "linear-gradient(to right, #BD9673, #7D5E42)",
          boxShadow: "-2px 3px 6px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 16,
          paddingBottom: 16,
          boxSizing: "border-box",
        }}
      >
        {/* Крестик только на телефоне: там панель разворачивается по нажатию,
            и закрыть её иначе нечем */}
        {isMobile && (
          <button
            onClick={() => setOpen(false)}
            aria-label="Закрыть действия"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              paddingBottom: 8,
              cursor: "pointer",
            }}
            className="active:opacity-70 transition-opacity"
          >
            <CloseIcon size={20} color="white" />
          </button>
        )}
        {[
          {
            label: "Поделиться",
            onClick: () => handleShare(),
            disabled: !isReady,
            icon: <ShareIcon width={32} height={32} stroke="white" strokeWidth={3} />,
          },
          {
            label: "Скачать",
            onClick: () => handleDownload(context?.songResponse.doc),
            disabled: !isReady || isDownloading,
            icon: <DownloadIcon width={32} height={32} stroke="white" strokeWidth={3} className={isDownloading ? "animate-bounce" : ""} />,
          },
          {
            label: "Печать",
            onClick: handlePrint,
            disabled: !isReady || isPrinting,
            icon: <PrinterIcon width={32} height={32} stroke="white" strokeWidth={3} className={isPrinting ? "animate-pulse" : ""} />,
          },
        ].map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.label}
            style={{
              flex: 1,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            className="active:opacity-70 transition-opacity disabled:opacity-40"
          >
            {action.icon}
          </button>
        ))}
      </div>
      {PrintElement}
    </>
  );
};
