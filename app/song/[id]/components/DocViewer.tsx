"use client";
import { useState } from "react";
import { Pagination } from "@heroui/pagination";
import { PdfPageCard } from "@/components/PdfPageCard";
import { SwarrowIconWithCircle } from "@/components/swarrow";
import { EyeSongPageView } from "@/components/EyeSongPageView";

export const DocViewer = ({ fileUrl, songId }: { fileUrl: string | File; songId?: string }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);

  return (
    <>
      <div className="pt-4 flex justify-center">
        <div className="relative w-full">
          <PdfPageCard
            cardClassName="w-full h-auto min-h-[420px]"
            fileUrl={fileUrl}
            pageNum={pageNum}
            setPdfDoc={setPdfDoc}
          />
          {songId && pdfDoc && (
            <EyeSongPageView songId={songId} buttonClassName="absolute top-2 right-2 z-10 min-w-0 px-2 py-2 bg-blue-50 text-blue-400 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm" />
          )}
        </div>
      </div>

      {pdfDoc?.numPages > 1 && (
        <div
          /* max-w и прокрутка внутри: ширина следует за содержимым, и на
             телефоне при десятке страниц полоса выходила за край экрана.
             Отступы и промежутки на телефоне меньше — иначе не помещается */
          className="sticky bottom-4 z-50 flex items-center justify-center gap-2 md:gap-4 p-2 md:p-4
            rounded-[2rem] border border-white/80 bg-white/5 backdrop-blur-xl
            shadow-2xl shadow-black/5 ring-1 ring-black/5
            mx-auto w-max max-w-[calc(100vw-1.5rem)] overflow-x-auto m-10"
        >
          <div
            onClick={() => pageNum > 1 && setPageNum(pageNum - 1)}
            className={`cursor-pointer p-1 md:p-3 scale-75 md:scale-100 shrink-0 ${
              pageNum > 1 ? "hover:opacity-80 hover:scale-105" : "opacity-30 cursor-not-allowed"
            } transition-all duration-200`}
            title="Предыдущая страница"
          >
            <SwarrowIconWithCircle width={50} height={13} circleSize={20} />
          </div>

          <Pagination
            onChange={setPageNum}
            total={pdfDoc.numPages}
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

          <div
            onClick={() => pdfDoc && pageNum < pdfDoc.numPages && setPageNum(pageNum + 1)}
            className={`cursor-pointer p-1 md:p-3 scale-75 md:scale-100 shrink-0 ${
              pdfDoc && pageNum < pdfDoc.numPages ? "hover:opacity-80 hover:scale-105" : "opacity-30 cursor-not-allowed"
            } transition-all duration-200`}
            title="Следующая страница"
          >
            <SwarrowIconWithCircle width={50} height={13} circleSize={20} className="rotate-180" />
          </div>
        </div>
      )}
    </>
  );
};
