"use client";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";

// Настройка воркера (обязательно!)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export function PdfViewer() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);

  function onDocumentLoadSuccess(pdf: PDFDocumentProxy): void {
    setNumPages(pdf.numPages);
  }

  return (
    <div style={{ textAlign: "center" }}>
      <Document file="/public/pdf.pdf" onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={pageNumber} />
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
