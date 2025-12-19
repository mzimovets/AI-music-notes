"use client";
import React from "react";
import { useState, useEffect, useRef } from "react";
import { title } from "@/components/primitives";
import { Button } from "@heroui/button";
import { LeftArr } from "@/components/LeftArr";
import { useRouter } from "next/navigation";
import { Card } from "@heroui/card";
import Pdfjs from "../home/pdfjs";
import { Breadcrumbs, BreadcrumbItem, Pagination } from "@heroui/react";
import { SwarrowIconWithCircle } from "@/components/swarrow";
import Separator from "@/components/Separator";
import ShareIcon from "@/components/ShareIcon";
import DownloadIcon from "@/components/DownloadIcon";
import PrinterIcon from "@/components/PrinterIcon";
import { Monogram } from "@/components/monogram";

export default function PricingPage() {
  const iframeRef = useRef();
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [currentPage, setCurrentPage] = React.useState(1);
  // useEffect(() => {
  //   if (!isOpen) {
  //     setPageNum(1);
  //   }
  // }, [isOpen]);
  const router = useRouter();
  const handlePrint = () => {
    const pdfUrl = `${process.env.PUBLIC_URL}/na_rekah_valaamskogo_r.f-d.pdf`;
    if (iframeRef.current) {
      iframeRef.current.src = pdfUrl;
      iframeRef.current.onload = () => {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      };
    }
  };

  return (
    <div>
      <div className="relative flex items-center">
        <Button
          onPress={() => router.back()}
          className="absolute -left-20 top-0 -ml-86 bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full px-6 py-2 text-2xl font-normal shadow-md w-auto min-w-0"
        >
          <LeftArr className="h-6 w-6" />
        </Button>
        <Breadcrumbs
          separator={<Separator />}
          className="absolute left-5 top-2 -ml-86"
        >
          <BreadcrumbItem href="/playlist/spiritual_chants">
            Духовные канты
          </BreadcrumbItem>
          <BreadcrumbItem href="/docs/components/code">
            Вера вечна
          </BreadcrumbItem>
        </Breadcrumbs>
      </div>
      <div>
        <p className="flex flex-col text-center justify-center font-header gap-4">
          Название
        </p>
        <p className="font-pheader">Автор</p>
        <div className="pt-4 flex justify-center">
          <Card
            className={`w-200 h-180 flex items-center justify-center p-2 transition-colors duration-200`}
          >
            <Pdfjs
              fileUrl="/testnotes.pdf"
              setPdfDoc={setPdfDoc}
              pageNum={pageNum}
            />
          </Card>
        </div>
        <div className="flex items-center justify-center mt-4 gap-4">
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

          <Pagination
            onChange={setPageNum}
            total={pdfDoc?.numPages || 0}
            page={pageNum}
            showControls={false}
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
      </div>
      <Card className="fixed items-center justify-center gap-6 left-0 top-70 h-50 w-20 p-2 shadow-lg rounded-tr-lg rounded-br-lg rounded-tl-none rounded-bl-none rounded-r-2xl">
        <button
          className="hover:opacity-100 transition-opacity duration-300 group"
          title="Поделиться"
        >
          <ShareIcon
            className="group-hover:text-gray-400 transition-colors duration-300"
            width={34}
            height={34}
          />
        </button>
        <button
          className="hover:opacity-100 transition-opacity duration-300 group"
          title="Скачать"
        >
          <a
            href="/testnotes.pdf"
            download="filename.pdf"
            className="hover:opacity-100 transition-opacity duration-300 group"
            title="Скачать"
          >
            <DownloadIcon width={34} height={34} />
          </a>
        </button>
        <button
          onClick={handlePrint}
          className="hover:opacity-100 transition-opacity duration-300 group"
          title="Печать"
        >
          <PrinterIcon width={34} height={34} />
        </button>
      </Card>
      <Card className="mt-8 p-3">
        <span className="flex items-center gap-42">
          <p className="card-header text-left pl-5">Информация о партитуре:</p>
          <Button
            isIconOnly
            className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full ml-10"
          >
            ред
          </Button>
        </span>
        <span className="pl-5">
          <span className="flex items-center  gap-2">
            <Separator />
            <p>Название: Вера вечна</p>
          </span>
          <span className="flex items-center  gap-2">
            <Separator />
            <p>Автор музыки: А. Молев</p>
          </span>
          <span className="flex items-center gap-2">
            <Separator />
            <p>Автор слов: -</p>
          </span>
          <span className="flex items-center  gap-2">
            <Separator />
            <p>Автор аранжировки: -</p>
          </span>
          <span className="flex items-center gap-2">
            <Separator />
            <p>Категория: Духовные канты</p>
          </span>
        </span>
      </Card>
      <div className="flex justify-center">
        <Monogram className="mt-10 h-7" />
      </div>
    </div>
  );
}
