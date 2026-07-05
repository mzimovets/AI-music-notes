"use client";
import { useSongContext } from "../SongContextProvider";
import { useShareSong } from "../../../../components/ShareSong";
import { useDownloadSong } from "../../../../components/DownloadSong";
import { usePrintSong } from "@/components/PrintSong";
import ShareIcon from "@/components/ShareIcon";
import PrinterIcon from "@/components/PrinterIcon";
import DownloadIcon from "@/components/DownloadIcon";

export const SongActionsSticker = () => {
  const context = useSongContext();
  const { handleShare } = useShareSong();
  const { handleDownload, isDownloading } = useDownloadSong();
  const { handlePrint, isLoading: isPrinting, PrintElement } = usePrintSong();

  const isReady = !!context?.songResponse;

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
