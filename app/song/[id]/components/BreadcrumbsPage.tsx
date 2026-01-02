"use client";
import { LeftArr } from "@/components/LeftArr";
import Separator from "@/components/Separator";
import { Button } from "@heroui/button";
import { Breadcrumbs, BreadcrumbItem } from "@heroui/react";
import { useParams, useRouter } from "next/navigation";
import { useSongContext } from "../SongContextProvider";
import { getCategoryDisplay } from "@/lib/utils";

export const BreadcrumbsPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const context = useSongContext();
  const song = context.songResponse.doc;

  return (
    <div className="relative flex items-center">
      <Button
        onPress={() => router.back()}
        className="absolute -left-20 top-0 -ml-86 bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full px-6 py-2 text-2xl font-normal shadow-md w-auto min-w-0"
      >
        <LeftArr className="h-6 w-6" />
      </Button>
      <Breadcrumbs
        separator={<Separator />}
        className="absolute left-37 top-2 -ml-86 input-header"
      >
        <BreadcrumbItem href={`/playlist/${song.category}`}>
          {getCategoryDisplay(song.category, "full")}
        </BreadcrumbItem>
        <BreadcrumbItem>{song.name}</BreadcrumbItem>
      </Breadcrumbs>
    </div>
  );
};
