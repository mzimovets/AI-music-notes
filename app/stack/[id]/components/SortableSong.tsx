"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { Card, Button } from "@heroui/react";
import { TrashBinIcon } from "./icons/TrashBinIcon";
import { DragIcon } from "./icons/DragIcon";
import { EyeIcon } from "./icons/EyeIcon";
import { useSession } from "next-auth/react";

interface SortableSongProps {
  song: any;
  index: number;
  onRemove: (id: string) => void;
  onPreview: (song: any) => void;
  onClick?: () => void; // добавляем optional onClick
}

export const SortableSong: React.FC<SortableSongProps> = ({
  song,
  index,
  onRemove,
  onPreview,
  onClick,
}) => {
  const { data: session } = useSession();
  const isRegent = session?.user?.role === "регент";

  const { attributes, listeners, isDragging } = useSortable({
    id: song.instanceId,
  });

  return (
    <Card
      className={`p-3 mb-2 flex-row items-center justify-between gap-4 ${
        isDragging ? "shadow-xl opacity-50" : "shadow-sm"
      } cursor-pointer`}
    >
      <Button
        className="touch-none select-none w-full bg-transparent"
        onPress={() => {
          onClick();
        }}
      >
        <div className="flex flex-col overflow-hidden w-full">
          <p className="text-bold text-sm capitalize text-left input-header truncate">
            <span className="mr-2 text-default-400">{index + 1}.</span>
            {song.name}
          </p>
          <p className="text-left text-bold text-sm capitalize input-header justify-center text-default-500 truncate w-full">
            {song.author}
          </p>
        </div>
      </Button>

      <div className="flex items-center gap-2">
        {isRegent && (
          <>
            <Button
              radius="lg"
              size="sm"
              onClick={() => onPreview(song)}
              className="min-w-0 px-3 bg-blue-50 text-blue-400 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-none"
            >
              <EyeIcon />
            </Button>
            <Button
              radius="lg"
              size="sm"
              onPress={() => onRemove(song.instanceId)}
              className="min-w-0 px-3 bg-red-50 text-red-400 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all shadow-none"
            >
              <TrashBinIcon />
            </Button>
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-default-400 hover:text-default-600"
            >
              <DragIcon />
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
