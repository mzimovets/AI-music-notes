"use client";
import { Tooltip } from "@heroui/react";
import { useCallback } from "react";
import { EyeIcon } from "../../../../components/icons/EyeIcon";
import { EditIcon } from "../../../../components/icons/EditIcon";
import { DeleteIcon } from "../../../../components/icons/DeleteIcon";
import { ServerSong, Song } from "@/lib/types";
import Link from "next/link";
import ShareIcon from "@/components/ShareIcon";
import { useShareSong } from "@/app/song/[id]/components/ShareSong";

export const useTableCell = () => {
  // const { handleShare } = useShareSong();
  const tableCell = useCallback((song: ServerSong, columnKey) => {
    const cellValue = song[columnKey];

    switch (columnKey) {
      case "name":
        return (
          <Link href={`/song/${song._id}`}>
            <div className="flex flex-col">
              <p className="text-bold text-sm capitalize text-left input-header">
                {song.name}
              </p>
              {/* <p className="text-bold text-sm capitalize text-default-400"></p> */}
            </div>
          </Link>
        );
      case "author":
        return (
          <Link href={`/song/${song._id}`}>
            <div className="flex flex-col">
              <p className="text-bold text-sm capitalize input-header justify-center">
                {song.author ? song.author : "-"}
              </p>
            </div>
          </Link>
        );
      case "actions":
        return (
          <div className="relative flex items-center gap-2 justify-end  gap-4">
            <Tooltip content="Поделиться">
              <button
                // onClick={() => handleShare(song)}
                className="text-lg text-default-400 cursor-pointer active:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                  />
                </svg>
              </button>
            </Tooltip>
            <Tooltip content="Скачать">
              <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
              </span>
            </Tooltip>
            <Tooltip content="Распечатать">
              <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z"
                  />
                </svg>
              </span>
            </Tooltip>
          </div>
        );
      default:
        return cellValue;
    }
  }, []);

  return tableCell;
};
