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
    <div className="flex items-start gap-8 font-header w-full">
      <Card className="h-47.5 flex-shrink-0">
        {" "}
        <Image
          alt="album cover"
          className="object-cover"
          height={200}
          src={`http://localhost:3000/${categoryObj?.image}`}
          width={200}
        />
      </Card>{" "}
      <div className="flex flex-col gap-4 flex-grow">
        <Card className="py-4">
          <CardHeader className="py-0 flex-col items-start">
            <p className="font-header ">{categoryObj?.name || category}</p>
            <small className="text-default-500">
              {songs.length} {getSongWord(songs.length)}
            </small>
          </CardHeader>
          <CardBody className="py-0">
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
            <Monogram className="h-6 mt-4 w-auto" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
