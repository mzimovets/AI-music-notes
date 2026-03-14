"use client";

import { useState } from "react";
import { Card } from "@heroui/card";

import Pdfjs from "@/app/home/pdfjs";

export const PdfTitlePage = ({ fileUrl }: { fileUrl: string | File }) => {
  const [, setPdfDoc] = useState<any>(null);
  const [pageNum] = useState<number>(1);

  return (
    <>
      <div className="pt-4 flex justify-center">
        <Card
          className={`w-125 h-auto flex items-center justify-center p-2 transition-colors duration-200`}
        >
          <Pdfjs fileUrl={fileUrl} pageNum={pageNum} setPdfDoc={setPdfDoc} />
        </Card>
      </div>
    </>
  );
};
