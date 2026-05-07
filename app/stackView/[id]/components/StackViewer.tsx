"use client";
import { useEffect, useState } from "react";

import Pdfjs from "@/app/home/pdfjs";
import { PdfPageCard } from "@/components/PdfPageCard";

export const StackViewer = ({
  fileUrl,
  pageOffset,
  pageCount: pageCountProp,
}: {
  fileUrl: string | File;
  pageOffset?: number;
  /** Если известно количество страниц (из X-Song-Pages), передаём сюда — скрытый Pdfjs не нужен */
  pageCount?: number;
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  useEffect(() => {
    // Если pageCount известен снаружи, pdfDoc нам не нужен
    if (!pageCountProp) setPdfDoc(null);
  }, [fileUrl, pageCountProp]);

  const handlePdfDoc = (doc: any) => {
    setPdfDoc(doc);
  };

  // Используем явно переданный pageCount или numPages из загруженного PDF
  const numPages = pageCountProp ?? pdfDoc?.numPages ?? 0;

  return (
    <div>
      <div className="pt-3 flex flex-col items-center">
        {/* Загружаем PDF только для получения numPages, если pageCount не передан снаружи */}
        {!pageCountProp && (
          <div style={{ display: "none" }}>
            {fileUrl && (
              <Pdfjs fileUrl={fileUrl} pageNum={1} setPdfDoc={handlePdfDoc} />
            )}
          </div>
        )}

        {/* Рендерим все страницы */}
        {numPages > 0 &&
          Array.from({ length: numPages }, (_, i) => {
            const relativePageNum = i + 1; // номер страницы внутри этого PDF (для рендера)
            const absolutePageNum = pageOffset != null ? pageOffset + i : relativePageNum; // для трекинга скролла

            return (
              <div
                key={i}
                className="w-full flex justify-center mb-4"
                data-page-number={absolutePageNum}
                data-file-url={String(fileUrl)}
                data-page-num={String(absolutePageNum)}
                id={`pdf-page-${absolutePageNum}`}
              >
                <PdfPageCard
                  cardClassName="md:w-200 w-full h-auto min-h-[520px]"
                  fileUrl={fileUrl}
                  pageNum={relativePageNum}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
};
