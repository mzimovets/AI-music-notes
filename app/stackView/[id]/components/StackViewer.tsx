"use client";

import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/react";
import { useState } from "react";

import Pdfjs from "@/app/home/pdfjs";

export const StackViewer = ({ fileUrl }: { fileUrl: string | File }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState<{ [key: number]: boolean }>(
    {},
  );

  const handlePageLoadStart = (pageNum: number) => {
    setPageLoading((prev) => ({ ...prev, [pageNum]: true }));
  };

  const handlePageLoadEnd = (pageNum: number) => {
    setPageLoading((prev) => ({ ...prev, [pageNum]: false }));
  };

  return (
    <div>
      <div className="pt-3 flex flex-col items-center">
        {/* Загружаем PDF и сохраняем pdfDoc */}
        <div style={{ display: "none" }}>
          {fileUrl && (
            <Pdfjs fileUrl={fileUrl} pageNum={1} setPdfDoc={setPdfDoc} />
          )}
        </div>

        {/* Рендерим все страницы */}
        {pdfDoc &&
          Array.from({ length: pdfDoc.numPages }, (_, i) => {
            const pageNum = i + 1;

            return (
              <div key={i} className="w-full flex justify-center mb-4">
                <Card className="w-200 h-auto relative flex items-center justify-center p-2 transition-colors duration-200">
                  <Pdfjs
                    fileUrl={fileUrl}
                    pageNum={pageNum}
                    onLoadEnd={() => handlePageLoadEnd(pageNum)}
                    onLoadStart={() => handlePageLoadStart(pageNum)}
                  />
                  {pageLoading[pageNum] ? (
                    <Skeleton className="absolute top-0 left-0 w-200 h-auto" />
                  ) : null}
                </Card>
              </div>
            );
          })}
      </div>
    </div>
  );
};
