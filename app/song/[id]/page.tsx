import React from "react";
import { Monogram } from "@/components/monogram";
import { InfoCard } from "./components/InfoCard";
import { BreadcrumbsPage } from "./components/BreadcrumbsPage";
import { getSongById } from "@/lib/utils";
import { SongContextProvider } from "./SongContextProvider";
import { DocViewerSection } from "./components/DocViewerSection";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const song = await getSongById(id);

  return (
    <SongContextProvider songResponse={song}>
      <div>
        <div>
          <div className="mb-6">
            <BreadcrumbsPage />
          </div>

          <p className="flex flex-col text-center justify-center font-header gap-4">
            {song.doc.name}
          </p>
          <p className="font-pheader text-center">{song.doc.author}</p>
          {song.doc.file?.filename && (
            <DocViewerSection
              fileUrl={`/uploads/${song.doc.file.filename}`}
              songId={id}
            />
          )}
        </div>
        <InfoCard />
        <div className="flex justify-center">
          <Monogram className="mt-10 h-7" />
        </div>
      </div>
    </SongContextProvider>
  );
}
