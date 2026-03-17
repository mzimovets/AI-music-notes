"use client";

import { useState } from "react";
import { Card } from "@heroui/card";
import { Pagination } from "@heroui/pagination";

import Pdfjs from "@/app/home/pdfjs";
import { SwarrowIconWithCircle } from "@/components/swarrow";

export const DocViewer = ({ fileUrl }: { fileUrl: string | File }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);

  return (
    <>
      <div className="pt-4 flex justify-center">
        <Card
          className={`w-200 h-auto flex items-center justify-center p-2 transition-colors duration-200`}
        >
          <Pdfjs fileUrl={fileUrl} pageNum={pageNum} setPdfDoc={setPdfDoc} />
        </Card>
      </div>
      <div
        className="sticky bottom-4 z-50 flex items-center justify-center gap-4 p-4 
                rounded-[2rem] border border-white/80 bg-white/5 backdrop-blur-xl 
                shadow-2xl shadow-black/5 ring-1 ring-black/5
                mx-auto w-max m-10"
      >
        <div
          className={`cursor-pointer p-3 ${
            pageNum > 1
              ? "hover:opacity-80 hover:scale-105"
              : "opacity-30 cursor-not-allowed"
          } transition-all duration-200`}
          role="button"
          tabIndex={0}
          title="Предыдущая страница"
          onClick={() => pageNum > 1 && setPageNum(pageNum - 1)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && pageNum > 1) {
              setPageNum(pageNum - 1);
            }
          }}
        >
          <SwarrowIconWithCircle circleSize={20} height={13} width={50} />
        </div>
        {pdfDoc?.numPages > 0 && (
          <Pagination
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
            page={pageNum}
            showControls={false}
            total={pdfDoc?.numPages || 0}
            onChange={setPageNum}
          />
        )}

        <div
          className={`cursor-pointer p-3 ${
            pdfDoc && pageNum < pdfDoc.numPages
              ? "hover:opacity-80 hover:scale-105"
              : "opacity-30 cursor-not-allowed"
          } transition-all duration-200`}
          role="button"
          tabIndex={0}
          title="Следующая страница"
          onClick={() =>
            pdfDoc && pageNum < pdfDoc.numPages && setPageNum(pageNum + 1)
          }
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" || e.key === " ") &&
              pdfDoc &&
              pageNum < pdfDoc.numPages
            ) {
              setPageNum(pageNum + 1);
            }
          }}
        >
          <SwarrowIconWithCircle
            circleSize={20}
            className="rotate-180"
            height={13}
            width={50}
          />
        </div>
      </div>
    </>
  );
};
