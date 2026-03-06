"use client";
import Pdfjs from "@/app/home/pdfjs";
import { ScrollToTop } from "@/app/stack/[id]/components/ScrollToTopButton";

import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/react";
import { useState } from "react";

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
          <Pdfjs fileUrl={fileUrl} setPdfDoc={setPdfDoc} pageNum={1} />
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
                    onLoadStart={() => handlePageLoadStart(pageNum)}
                    onLoadEnd={() => handlePageLoadEnd(pageNum)}
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
