"use client";

import { useEffect, useState } from "react";

import Pdfjs from "@/app/home/pdfjs";
import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/react";
import clsx from "clsx";

interface PdfPageCardProps {
  fileUrl: string | File;
  pageNum: number;
  setPdfDoc?: (doc: any) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  cardClassName?: string;
  skeletonClassName?: string;
}

export const PdfPageCard = ({
  fileUrl,
  pageNum,
  setPdfDoc,
  onLoadStart,
  onLoadEnd,
  cardClassName,
  skeletonClassName,
}: PdfPageCardProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
  }, [fileUrl, pageNum]);

  return (
    <Card
      className={clsx(
        "relative flex items-center justify-center p-2 transition-colors duration-200",
        cardClassName,
      )}
    >
      {isLoading && (
        <Skeleton
          className={clsx(
            "absolute inset-0 z-10 rounded-xl",
            skeletonClassName,
          )}
        />
      )}
      <Pdfjs
        fileUrl={fileUrl}
        onLoadStart={() => {
          setIsLoading(true);
          onLoadStart?.();
        }}
        onLoadEnd={() => {
          setIsLoading(false);
          onLoadEnd?.();
        }}
        pageNum={pageNum}
        setPdfDoc={setPdfDoc}
      />
    </Card>
  );
};
