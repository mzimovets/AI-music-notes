"use client";
import Pdfjs from "@/app/home/pdfjs";
import { SwarrowIconWithCircle } from "@/components/swarrow";
import { Card } from "@heroui/card";
import { Pagination } from "@heroui/pagination";
import { useState } from "react";

export const Viewer = ({ fileUrl }: { fileUrl: string | File }) => {
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

        <div
          onClick={() => pageNum > 1 && setPageNum(pageNum - 1)}
          className={`fixed left-4 top-1/2 -translate-y-1/2 z-50 cursor-pointer p-4 rounded-full 
      bg-white/10 backdrop-blur-xl border border-white/80 shadow-2xl ring-1 ring-black/5
      ${pageNum > 1 ? "hover:opacity-80 hover:scale-105" : "opacity-30 cursor-not-allowed"}
      transition-all duration-200`}
          title="Предыдущая страница"
        >
          <SwarrowIconWithCircle width={50} height={13} circleSize={20} />
        </div>

        <div
          onClick={() =>
            pdfDoc && pageNum < pdfDoc.numPages && setPageNum(pageNum + 1)
          }
          className={`fixed right-4 top-1/2 -translate-y-1/2 z-50 cursor-pointer p-4 rounded-full 
      bg-white/10 backdrop-blur-xl border border-white/80 shadow-2xl ring-1 ring-black/5
      ${pdfDoc && pageNum < pdfDoc.numPages ? "hover:opacity-80 hover:scale-105" : "opacity-30 cursor-not-allowed"}
      transition-all duration-200`}
          title="Следующая страница"
        >
          <SwarrowIconWithCircle
            width={50}
            height={13}
            circleSize={20}
            className="rotate-180"
          />
        </div>

        {pdfDoc?.numPages > 0 && (
          <div
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40
  bg-white/10 backdrop-blur-xl border border-white/80 shadow-2xl ring-1 ring-black/5
  rounded-[2rem] transition-all duration-200 px-4 pt-2"
          >
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
          </div>
        )}
      </div>
    </>
  );
};
