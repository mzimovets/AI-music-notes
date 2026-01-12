"use client";
import Pdfjs from "@/app/home/pdfjs";
import { SwarrowIconWithCircle } from "@/components/swarrow";
import { Card } from "@heroui/card";
import { Pagination } from "@heroui/pagination";
import { useState } from "react";

export const DocViewer = ({ fileUrl }: { fileUrl: string | File }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);

  return (
    <>
      <div className="pt-4 flex justify-center">
        <Card
          className={`w-200 h-auto flex items-center justify-center p-2 transition-colors duration-200`}
        >
          <Pdfjs fileUrl={fileUrl} setPdfDoc={setPdfDoc} pageNum={pageNum} />
        </Card>
      </div>
      <div
        className="sticky bottom-4 z-50 flex items-center justify-center gap-4 p-4 
                rounded-[2rem] border border-white/80 bg-white/5 backdrop-blur-xl 
                shadow-2xl shadow-black/5 ring-1 ring-black/5
                mx-auto w-max m-10"
      >
        <div
          onClick={() => pageNum > 1 && setPageNum(pageNum - 1)}
          className={`cursor-pointer p-3 ${
            pageNum > 1
              ? "hover:opacity-80 hover:scale-105"
              : "opacity-30 cursor-not-allowed"
          } transition-all duration-200`}
          title="Предыдущая страница"
        >
          <SwarrowIconWithCircle width={50} height={13} circleSize={20} />
        </div>
        {pdfDoc?.numPages > 0 && (
          <Pagination
            onChange={setPageNum}
            total={pdfDoc?.numPages || 0}
            page={pageNum}
            showControls={false}
            className="pb-4"
            classNames={{
              wrapper: "font-header",
              item: [
                "font-pagination",
                "text-gray-700",
                "data-[hover=true]:text-white",
                "data-[hover=true]:bg-gradient-to-r",
                "data-[hover=true]:from-[#BD9673]",
                "data-[hover=true]:to-[#7D5E42]",
                "transition-colors duration-200",
              ].join(" "),
              cursor: [
                "font-pagination",
                "bg-gradient-to-r from-[#BD9673] to-[#7D5E42]",
                "text-white",
                "font-bold",
                "shadow-lg",
              ].join(" "),
            }}
          />
        )}

        <div
          onClick={() =>
            pdfDoc && pageNum < pdfDoc.numPages && setPageNum(pageNum + 1)
          }
          className={`cursor-pointer p-3 ${
            pdfDoc && pageNum < pdfDoc.numPages
              ? "hover:opacity-80 hover:scale-105"
              : "opacity-30 cursor-not-allowed"
          } transition-all duration-200`}
          title="Следующая страница"
        >
          <SwarrowIconWithCircle
            width={50}
            height={13}
            circleSize={20}
            className="rotate-180"
          />
        </div>
      </div>
    </>
  );
};
