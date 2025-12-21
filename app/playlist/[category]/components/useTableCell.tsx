"use client";
import { Tooltip } from "@heroui/react";
import { useCallback } from "react";
import { EyeIcon } from "../../../../components/icons/EyeIcon";
import { EditIcon } from "../../../../components/icons/EditIcon";
import { DeleteIcon } from "../../../../components/icons/DeleteIcon";
import { Song } from "@/lib/types";

export const useTableCell = () => {
  const tableCell = useCallback((song: Song, columnKey) => {
    const cellValue = song[columnKey];

    switch (columnKey) {
      case "name":
        return (
          <a href="/song">
            <div className="flex flex-col">
              <p className="text-bold text-sm capitalize">{cellValue}</p>
              <p className="text-bold text-sm capitalize text-default-400">
                {song.name}
              </p>
            </div>
          </a>
        );
      case "author":
        return (
          <a href="/song">
            <div className="flex flex-col">
              <p className="text-bold text-sm capitalize">{cellValue}</p>
              <p className="text-bold text-sm capitalize text-default-400">
                {song.author}
              </p>
            </div>
          </a>
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
