"use client";
import { useEffect, useState } from "react";

import Pdfjs from "@/app/home/pdfjs";
import { PdfPageCard } from "@/components/PdfPageCard";

export const StackViewer = ({ fileUrl }: { fileUrl: string | File }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  useEffect(() => {
    setPdfDoc(null);
  }, [fileUrl]);

  const handlePdfDoc = (doc: any) => {
    setPdfDoc(doc);
  };

  return (
    <div>
      <div className="pt-3 flex flex-col items-center">
        {/* Загружаем PDF и сохраняем pdfDoc */}
        <div style={{ display: "none" }}>
          {fileUrl && (
            <Pdfjs fileUrl={fileUrl} pageNum={1} setPdfDoc={handlePdfDoc} />
          )}
        </div>

        {/* Рендерим все страницы */}
        {pdfDoc &&
          Array.from({ length: pdfDoc.numPages }, (_, i) => {
            const pageNum = i + 1;

            return (
              <div
                key={i}
                className="w-full flex justify-center mb-4"
                data-page-number={pageNum}
                data-file-url={String(fileUrl)}
                data-page-num={String(pageNum)}
                id={`pdf-page-${pageNum}`}
              >
                <PdfPageCard
                  cardClassName="w-200 h-auto min-h-[520px]"
                  fileUrl={fileUrl}
                  pageNum={pageNum}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
};
