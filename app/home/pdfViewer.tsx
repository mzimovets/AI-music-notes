"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { pdfjs } from "react-pdf";

// Настройка воркера (только на клиенте)
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

// Отключаем SSR для компонентов react-pdf
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  {
    ssr: false,
  }
);
const Page = dynamic(() => import("react-pdf").then((mod) => mod.Page), {
  ssr: false,
});

export function PdfViewer() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);

  function onDocumentLoadSuccess(pdf: any) {
    setNumPages(pdf.numPages);
  }

  return (
    <div style={{ textAlign: "center" }}>
      <Document file="/pdf.pdf" onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={pageNumber} width={600} />
      </Document>

      <div style={{ marginTop: "10px" }}>
        <button
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(pageNumber - 1)}
        >
          Previous
        </button>
        <button
          disabled={!numPages || pageNumber >= numPages}
          onClick={() => setPageNumber(pageNumber + 1)}
          style={{ marginLeft: "10px" }}
        >
          Next
        </button>
      </div>

      <p>
        Page {pageNumber} of {numPages ?? "..."}
      </p>
    </div>
  );
}
