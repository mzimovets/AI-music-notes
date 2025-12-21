"use client";
import { SearchIcon } from "@/components/icons";
import { Monogram } from "@/components/monogram";
import { useParams } from "next/navigation";
import { Card, Input, CardBody, CardHeader, Image } from "@heroui/react";
import { usePlaylistContext } from "../PlaylistContextProvider";

interface IProps {
  categorySongs: { key: string; name: string }[];
}

export const CategoryHeader = ({ categorySongs }: IProps) => {
  const params = useParams<{ category: string }>();
  const { category } = params;

  const context = usePlaylistContext();
  const { songsResponse } = context;
  const songs = songsResponse?.docs;

  return (
    <div className="flex items-start gap-8 font-header w-full">
      <Card className="h-47.5 flex-shrink-0">
        {" "}
        <Image
          alt="album cover"
          className="object-cover"
          height={200}
          src="/cover.png"
          width={200}
        />
      </Card>{" "}
      {/* ← не будет сжиматься */}
      <div className="flex flex-col gap-4 flex-grow">
        {/* ← займет оставшееся пространство */}
        <Card className="py-4">
          <CardHeader className="py-0 flex-col items-start">
            <p className="font-header ">
              {categorySongs.find((ctg) => ctg.key == category)?.name ||
                category}
            </p>
            <small className="text-default-500">{songs.length} песен</small>
          </CardHeader>
          <CardBody className="py-0">
            <Input
              type="search"
              placeholder="Поиск"
              endContent={<SearchIcon className="text-default-400" />}
              className="mx-auto mt-4"
              classNames={{
                inputWrapper: "bg-[#FFFAF5] rounded-md",
                input: "text-sm",
              }}
            />
            <Monogram className="h-6 mt-4 w-auto" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
