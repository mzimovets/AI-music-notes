"use client";
import { useSongContext } from "../SongContextProvider";
import { useShareSong } from "./ShareSong";
import { useDownloadSong } from "./DownloadSong";
import { usePrintSong } from "./PrintSong";
import ShareIcon from "@/components/ShareIcon";
import PrinterIcon from "@/components/PrinterIcon";
import DownloadIcon from "@/components/DownloadIcon";

export const SongActions = () => {
  const context = useSongContext();

  // Инициализируем все три хука
  const { handleShare } = useShareSong();
  const { handleDownload, isDownloading } = useDownloadSong();
  const { handlePrint, isLoading: isPrinting, PrintElement } = usePrintSong();

  const isReady = !!context?.songResponse;

  return (
    <>
      <button
        onClick={() => handleShare()}
        disabled={!isReady}
        className="hover:opacity-100 transition-opacity duration-300 group hover:scale-110 transition-transform disabled:opacity-50"
      >
        <ShareIcon width={34} height={34} />
      </button>

      <button
        onClick={handleDownload}
        disabled={!isReady || isDownloading}
        className={`hover:opacity-100 transition-opacity duration-300 group hover:scale-110 transition-transform ${
          isDownloading ? "opacity-50 cursor-wait" : "disabled:opacity-50"
        }`}
      >
        <DownloadIcon
          width={34}
          height={34}
          className={isDownloading ? "animate-bounce" : ""}
        />
      </button>

      <button
        onClick={handlePrint}
        disabled={!isReady || isPrinting}
        className={`hover:opacity-100 transition-opacity duration-300 group hover:scale-110 transition-transform ${
          isPrinting ? "opacity-50 cursor-not-allowed" : "disabled:opacity-50"
        }`}
      >
        <PrinterIcon
          width={34}
          height={34}
          className={isPrinting ? "animate-pulse" : ""}
        />
      </button>
      {PrintElement}
    </>
  );
};
