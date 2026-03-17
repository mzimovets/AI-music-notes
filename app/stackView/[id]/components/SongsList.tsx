"use client";
import { Fragment } from "react";

import { StackViewer } from "./StackViewer";

import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
import { mealFilesMap } from "@/app/stack/[id]/constants";
import { StackSong } from "@/lib/types";

export const SongsList = ({
  songs,
  isReserved,
}: {
  songs: StackSong[];
  isReserved: boolean;
}) => {
  const { mealType, programSelected } = useStackContext();

  return songs.map((song, index) => (
    <Fragment key={song.instanceId || index}>
      {index === 0 &&
        programSelected.includes("Трапеза") &&
        mealType &&
        mealFilesMap[mealType]?.start &&
        !isReserved && (
          <div id={`meal_start`}>
            <StackViewer fileUrl={`/${mealFilesMap[mealType].start}`} />
          </div>
        )}

      <div id={`${song._id}_${index}${isReserved ? "_reserved" : ""}`}>
        <StackViewer
          fileUrl={`${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/uploads/${song.file.filename}`}
        />
      </div>

      {/* Вставляем PDF конца трапезы */}
      {index === songs.length - 1 &&
        programSelected.includes("Трапеза") &&
        mealType &&
        mealFilesMap[mealType]?.end &&
        !isReserved && (
          <div id={`meal_end`}>
            <StackViewer fileUrl={`/${mealFilesMap[mealType].end}`} />
          </div>
        )}
    </Fragment>
  ));
};
