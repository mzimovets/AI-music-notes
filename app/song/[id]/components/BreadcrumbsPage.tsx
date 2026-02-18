"use client";
import { LeftArr } from "@/components/LeftArr";
import Separator from "@/components/Separator";
import { Button } from "@heroui/button";
import { Breadcrumbs, BreadcrumbItem } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useSongContext } from "../SongContextProvider";
import { getCategoryDisplay } from "@/lib/utils";

export const BreadcrumbsPage = () => {
  const router = useRouter();
  const { songResponse } = useSongContext();
  const song = songResponse.doc;

  return (
    <div className="flex items-center gap-4">
      <Button
        onPress={() => router.back()}
        className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full px-4 py-2 shadow-md min-w-0"
      >
        <LeftArr className="h-6 w-6" />
      </Button>

      <Breadcrumbs separator={<Separator />} className="input-header">
        <BreadcrumbItem href={`/playlist/${song.category}`}>
          {getCategoryDisplay(song.category, "full")}
        </BreadcrumbItem>
        <BreadcrumbItem>{song.name}</BreadcrumbItem>
      </Breadcrumbs>
    </div>
  );
};
