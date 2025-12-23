"use client";
import PrinterIcon from "@/components/PrinterIcon";
import { useRef } from "react";

export const PrintSong = () => {
  const iframeRef = useRef();

  const handlePrint = () => {
    const pdfUrl = `${process.env.PUBLIC_URL}/testnotes.pdf`;
    if (iframeRef.current) {
      iframeRef.current.src = pdfUrl;
      iframeRef.current.onload = () => {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      };
    }
  };

  return (
    <button
      onClick={handlePrint}
      className="hover:opacity-100 transition-opacity duration-300 group"
      title="Печать"
    >
      <PrinterIcon width={34} height={34} />
    </button>
  );
};
