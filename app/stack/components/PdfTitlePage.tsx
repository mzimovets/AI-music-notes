"use client";
import Pdfjs from "@/app/home/pdfjs";
import { SwarrowIconWithCircle } from "@/components/swarrow";
import { Card } from "@heroui/card";
import { Pagination } from "@heroui/pagination";
import { useState } from "react";

export const PdfTitlePage = ({ fileUrl }: { fileUrl: string | File }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);

  return (
    <>
      <div className="pt-4 flex justify-center">
        <Card
          className={`w-125 h-auto flex items-center justify-center p-2 transition-colors duration-200`}
        >
          <Pdfjs fileUrl={fileUrl} setPdfDoc={setPdfDoc} pageNum={pageNum} />
        </Card>
      </div>
    </>
  );
};
