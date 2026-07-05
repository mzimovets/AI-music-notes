"use client";
import Separator from "@/components/Separator";
import { Breadcrumbs, BreadcrumbItem } from "@heroui/react";
import { useSongContext } from "../SongContextProvider";
import { getCategoryDisplay } from "@/lib/utils";

export const BreadcrumbsPage = () => {
  const { songResponse } = useSongContext();
  const song = songResponse.doc;

  return (
    <div className="flex items-center gap-4 pl-10">
      <Breadcrumbs separator={<Separator />} className="input-header">
        <BreadcrumbItem href={`/playlist/${song.category}`}>
          {getCategoryDisplay(song.category, "full")}
        </BreadcrumbItem>
        <BreadcrumbItem>{song.name}</BreadcrumbItem>
      </Breadcrumbs>
    </div>
  );
};
