"use client";
import { DocViewer } from "./DocViewer";
import { EyeSongPageView } from "@/components/EyeSongPageView";

export function DocViewerSection({
  fileUrl,
  songId,
}: {
  fileUrl: string;
  songId: string;
}) {
  return (
    <div className="relative inline-block w-full">
      <DocViewer fileUrl={fileUrl} />
      <EyeSongPageView songId={songId} className="absolute top-4 right-2 z-10" />
    </div>
  );
}
