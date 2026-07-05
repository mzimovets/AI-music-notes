import React from "react";
import { Monogram } from "@/components/monogram";
import { InfoCard } from "./components/InfoCard";
import { NavBackButton } from "./components/NavBackButton";
import { SongActionsSticker } from "./components/SongActionsSticker";
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
      <NavBackButton />
      <div className="w-full">
        <div>
          <p className="flex flex-col text-center justify-center font-header gap-4">
            {song.doc.name}
          </p>
          <p className="font-pheader text-center">{song.doc.author}</p>
          {song.doc.file?.filename && (
            <DocViewerSection
              fileUrl={`/uploads/${song.doc.file.filename}`}
              songId={id}
            >
              <SongActionsSticker />
            </DocViewerSection>
          )}
        </div>
        <div className="pt-4 flex justify-center">
          <div className="w-full">
            <InfoCard />
          </div>
        </div>
        <div className="flex justify-center">
          <Monogram className="mt-10 h-7" />
        </div>
      </div>
    </SongContextProvider>
  );
}
