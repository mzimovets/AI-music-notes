"use client";
import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
import { mealFilesMap } from "@/app/stack/[id]/constants";
import { Fragment, useEffect } from "react";
import { StackViewer } from "./StackViewer";
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
          <StackViewer fileUrl={`/${mealFilesMap[mealType].start}`} />
        )}

      <StackViewer
        fileUrl={`http://localhost:4000/uploads/${song.file.filename}`}
      />

      {/* Вставляем PDF конца трапезы */}
      {index === songs.length - 1 &&
        programSelected.includes("Трапеза") &&
        mealType &&
        mealFilesMap[mealType]?.end &&
        !isReserved && (
          <StackViewer fileUrl={`/${mealFilesMap[mealType].end}`} />
        )}
    </Fragment>
  ));
};
