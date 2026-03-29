"use client";
import { SearchIcon } from "@/components/icons";
import { Monogram } from "@/components/monogram";
import { useParams } from "next/navigation";
import { Card, Input, CardBody, CardHeader, Image } from "@heroui/react";
import { usePlaylistContext } from "../PlaylistContextProvider";
import { categorySongs } from "@/components/constants";
import { ChangeEvent } from "react";

export const CategoryHeader = () => {
  const params = useParams<{ category: string }>();
  const { category } = params;

  const context = usePlaylistContext();
  const { songsResponse } = context;
  const songs = songsResponse?.docs;
  const count = songs.length;
  const { searchValue, setSearchValue } = context;

  const getSongWord = (count: number) => {
    if (count === 0) return "песен";

    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return "песен";
    }

    if (lastDigit === 1) {
      return "песня";
    } else if (lastDigit >= 2 && lastDigit <= 4) {
      return "песни";
    } else {
      return "песен";
    }
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  };

  const categoryObj = categorySongs.find((ctg) => ctg.key == category);

  return (
    <div className="flex flex-col md:flex-row gap-8" >
      {/* Левая колонка с изображением */}
      <div className="flex justify-center md:block md:w-auto md:grow-0">
        <Card className="w-[200px] aspect-square">
          <Image
            alt="album cover"
            className="object-cover w-full h-full"
            src={`${process.env.NEXT_PUBLIC_BASIC_URL}/${categoryObj?.image}`}
            width={200}
            height={200}
          />
        </Card>
      </div>

      {/* Правая колонка с контентом */}
      <div className="md:flex-1" style={{flexGrow: 1}}>
        <Card className="py-4 w-full h-full">
          <CardHeader className="py-0 flex-col items-start">
            <p className="font-header ">{categoryObj?.name || category}</p>
            <small className="text-default-500">
              {songs.length} {getSongWord(songs.length)}
            </small>
          </CardHeader>
          <CardBody className="py-0 w-full">
            <Input
              type="search"
              placeholder="Поиск"
              value={searchValue}
              isClearable
              onClear={() => setSearchValue("")}
              onChange={handleSearchChange}
              startContent={<SearchIcon className="text-default-400 mr-2" />}
              className="mx-auto mt-4"
              classNames={{
                inputWrapper: "bg-[#FFFAF5] rounded-md",
                input: "text-sm",
                clearButton: "text-[#BD9673] hover:text-[#7D5E42]",
              }}
            />
            <Monogram className="mt-4" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
