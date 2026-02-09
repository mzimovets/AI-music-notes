"use client";
import Pdfjs from "@/app/home/pdfjs";
import { ScrollToTop } from "@/app/stack/[id]/components/ScrollToTopButton";

import { Card } from "@heroui/card";
import { useState } from "react";

export const StackViewer = ({ fileUrl }: { fileUrl: string | File }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  return (
    <div className="pt-3 flex flex-col items-center">
      <ScrollToTop />

      {/* Загружаем PDF и сохраняем pdfDoc */}
      <div style={{ display: "none" }}>
        <Pdfjs fileUrl={fileUrl} setPdfDoc={setPdfDoc} pageNum={1} />
      </div>

      {/* Рендерим все страницы */}
      {pdfDoc &&
        Array.from({ length: pdfDoc.numPages }, (_, i) => (
          <div key={i} className="w-full flex justify-center mb-4">
            <Card className="w-200 h-auto flex items-center justify-center p-2 transition-colors duration-200">
              <Pdfjs fileUrl={fileUrl} pageNum={i + 1} />
            </Card>
          </div>
        ))}
    </div>
  );
};
