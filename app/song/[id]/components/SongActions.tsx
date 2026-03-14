"use client";
import { useSongContext } from "../SongContextProvider";
import { useShareSong } from "../../../../components/ShareSong";
import { useDownloadSong } from "../../../../components/DownloadSong";

import { usePrintSong } from "@/components/PrintSong";
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
        className="hover:opacity-100 transition-opacity duration-300 group hover:scale-110 transition-transform disabled:opacity-50"
        disabled={!isReady}
        onClick={() => handleShare()}
      >
        <ShareIcon height={34} width={34} />
      </button>

      <button
        className={`hover:opacity-100 transition-opacity duration-300 group hover:scale-110 transition-transform ${
          isDownloading ? "opacity-50 cursor-wait" : "disabled:opacity-50"
        }`}
        disabled={!isReady || isDownloading}
        onClick={() => {
          handleDownload(context?.songResponse.doc);
        }} // callback последний
      >
        <DownloadIcon
          className={isDownloading ? "animate-bounce" : ""}
          height={34}
          width={34}
        />
      </button>

      <button
        className={`hover:opacity-100 transition-opacity duration-300 group hover:scale-110 transition-transform ${
          isPrinting ? "opacity-50 cursor-not-allowed" : "disabled:opacity-50"
        }`}
        disabled={!isReady || isPrinting}
        onClick={handlePrint} // callback последний
      >
        <PrinterIcon
          className={isPrinting ? "animate-pulse" : ""}
          height={34}
          width={34}
        />
      </button>
      {PrintElement}
    </>
  );
};
