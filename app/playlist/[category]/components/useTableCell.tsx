"use client";
import { Tooltip } from "@heroui/react";
import { useCallback } from "react";
import { EyeIcon } from "../../../../components/icons/EyeIcon";
import { EditIcon } from "../../../../components/icons/EditIcon";
import { DeleteIcon } from "../../../../components/icons/DeleteIcon";
import { ServerSong, Song } from "@/lib/types";
import Link from "next/link";

export const useTableCell = () => {
  const tableCell = useCallback((song: ServerSong, columnKey) => {
    const cellValue = song[columnKey];
    console.log("song: ", song);
    switch (columnKey) {
      case "name":
        return (
          <Link href={`/song/${song._id}`}>
            <div className="flex flex-col">
              <p className="text-bold text-sm capitalize">{song.name}</p>
              {/* <p className="text-bold text-sm capitalize text-default-400"></p> */}
            </div>
          </Link>
        );
      case "author":
        return (
          <Link href={`/song/${song._id}`}>
            <div className="flex flex-col">
              <p className="text-bold text-sm capitalize">{cellValue}</p>
              <p className="text-bold text-sm capitalize text-default-400">
                {song.author}
              </p>
            </div>
          </Link>
        );
      case "actions":
        return (
          <div className="relative flex items-center gap-2 justify-center gap-4">
            <Tooltip content="Details">
              <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                <EyeIcon />
              </span>
            </Tooltip>
            <Tooltip content="Edit user">
              <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                <EditIcon />
              </span>
            </Tooltip>
            <Tooltip color="danger" content="Delete user">
              <span className="text-lg text-danger cursor-pointer active:opacity-50">
                <DeleteIcon />
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
