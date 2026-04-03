"use client";
import { PdfPageCard } from "@/components/PdfPageCard";

export const PdfTitlePage = ({ fileUrl }: { fileUrl: string | File }) => {
  return (
    <div className="pt-4 flex justify-center">
      <PdfPageCard
        cardClassName="w-125 h-auto min-h-[280px]"
        fileUrl={fileUrl}
        pageNum={1}
      />
    </div>
  );
};
