"use client";
import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
import { mealFilesMap } from "@/app/stack/[id]/constants";
import { Fragment } from "react";
import { StackViewer } from "./StackViewer";
import { StackSong } from "@/lib/types";

export const SongsList = ({
  songs,
  isReserved,
  songPageDataById,
  trapezaStartOffset,
  trapezaEndOffset,
  trapezaStartPageCount,
  trapezaEndPageCount,
}: {
  songs: StackSong[];
  isReserved: boolean;
  /** Данные страниц по songId — не зависят от порядка, исключают несоответствие pageCount */
  songPageDataById?: Map<string, { pageOffset: number; pageCount: number }>;
  trapezaStartOffset?: number;
  trapezaEndOffset?: number;
  trapezaStartPageCount?: number;
  trapezaEndPageCount?: number;
}) => {
  const { mealType, programSelected } = useStackContext();

  return songs.map((song, index) => {
    const pageData = songPageDataById?.get(song._id);
    return (
      <Fragment key={song.instanceId || index}>
        {index === 0 &&
          programSelected.includes("Трапеза") &&
          mealType &&
          mealFilesMap[mealType]?.start &&
          !isReserved && (
            <div id={`meal_start`}>
              <StackViewer
                fileUrl={`/${mealFilesMap[mealType].start}`}
                pageOffset={trapezaStartOffset}
                pageCount={trapezaStartPageCount}
              />
            </div>
          )}

        <div id={`${song._id}_${index}${isReserved ? "_reserved" : ""}`}>
          <StackViewer
            fileUrl={`/uploads/${song.file.filename}`}
            pageOffset={pageData?.pageOffset}
            pageCount={pageData?.pageCount}
          />
        </div>

        {/* Вставляем PDF конца трапезы */}
        {index === songs.length - 1 &&
          programSelected.includes("Трапеза") &&
          mealType &&
          mealFilesMap[mealType]?.end &&
          !isReserved && (
            <div id={`meal_end`}>
              <StackViewer
                fileUrl={`/${mealFilesMap[mealType].end}`}
                pageOffset={trapezaEndOffset}
                pageCount={trapezaEndPageCount}
              />
            </div>
          )}
      </Fragment>
    );
  });
};
