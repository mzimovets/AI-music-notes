import React from "react";
import { Card } from "@heroui/card";

import { SongContextProvider } from "./SongContextProvider";
import { SongActions } from "./components/SongActions";
import { InfoCard } from "./components/InfoCard";
import { DocViewer } from "./components/DocViewer";
import { BreadcrumbsPage } from "./components/BreadcrumbsPage";

import { Monogram } from "@/components/monogram";
import { EyeSongPageView } from "@/components/EyeSongPageView";
import { getSongById } from "@/lib/utils";

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
            <div className="relative inline-block">
              <DocViewer
                fileUrl={`${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/uploads/${song.doc.file.filename}`}
              />
              <EyeSongPageView
                className="absolute top-4 right-2 z-10"
                songId={id}
              />
            </div>
          )}
        </div>
        <Card className="fixed items-center justify-center gap-6 left-0 top-70 h-50 w-20 p-2 shadow-lg rounded-tr-lg rounded-br-lg rounded-tl-none rounded-bl-none rounded-r-2xl">
          <SongActions />
        </Card>
        <InfoCard />
        <div className="flex justify-center">
          <Monogram className="mt-10 h-7" />
        </div>
      </div>
    </SongContextProvider>
  );
}
