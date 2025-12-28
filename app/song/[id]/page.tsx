import React from "react";
import { Card } from "@heroui/card";
import { Monogram } from "@/components/monogram";
import { InfoCard } from "./components/InfoCard";
import { PrintSong } from "./components/PrintSong";
import { DownloadSong } from "./components/DownloadSong";
import { ShareSong } from "./components/ShareSong";
import { DocViewer } from "./components/DocViewer";
import { BreadcrumbsPage } from "./components/BreadcrumbsPage";
import { getSongById } from "@/lib/utils";
import { SongContextProvider } from "./SongContextProvider";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const song = await getSongById(id);
  console.log(song);

  return (
    <SongContextProvider songResponse={song}>
      <div>
        <BreadcrumbsPage />
        <div>
          <p className="flex flex-col text-center justify-center font-header gap-4">
            {song.doc.name}
          </p>
          <p className="font-pheader text-center">{song.doc.author}</p>
          {song.doc.file?.filename && (
            <DocViewer
              fileUrl={`http://localhost:4000/uploads/${song.doc.file.filename}`}
            />
          )}
        </div>
        <Card className="fixed items-center justify-center gap-6 left-0 top-70 h-50 w-20 p-2 shadow-lg rounded-tr-lg rounded-br-lg rounded-tl-none rounded-bl-none rounded-r-2xl">
          <ShareSong />
          <DownloadSong />
          <PrintSong />
        </Card>
        <InfoCard />
        <div className="flex justify-center">
          <Monogram className="mt-10 h-7" />
        </div>
      </div>
    </SongContextProvider>
  );
}
