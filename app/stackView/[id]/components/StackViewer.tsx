"use client";
import Pdfjs from "@/app/home/pdfjs";

import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/react";
import { useState, useRef, useCallback } from "react";

export const StackViewer = ({ fileUrl }: { fileUrl: string | File }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState<{ [key: number]: boolean }>({});
  const initializedRef = useRef(false);

  const handlePdfDoc = (doc: any) => {
    setPdfDoc(doc);
    if (!initializedRef.current) {
      initializedRef.current = true;
      const initial: { [key: number]: boolean } = {};
      for (let i = 1; i <= doc.numPages; i++) initial[i] = true;
      setPageLoading(initial);
    }
  };

  return (
    <div>
      <div className="pt-3 flex flex-col items-center">
        {/* Загружаем PDF и сохраняем pdfDoc */}
        <div style={{ display: "none" }}>
          {fileUrl && (
            <Pdfjs fileUrl={fileUrl} setPdfDoc={handlePdfDoc} pageNum={1} />
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
                id={`pdf-page-${pageNum}`}
              >
                <Card className="w-200 h-auto relative flex items-center justify-center p-2 transition-colors duration-200">
                  {pageLoading[pageNum] && (
                    <Skeleton className="absolute inset-0 z-10 rounded-xl" />
                  )}
                  <Pdfjs
                    fileUrl={fileUrl}
                    pageNum={pageNum}
                    onLoadEnd={() => setPageLoading((prev) => ({ ...prev, [pageNum]: false }))}
                  />
                </Card>
              </div>
            );
          })}
      </div>
    </div>
  );
};
