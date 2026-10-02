"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, Button } from "@heroui/react";
import { TrashBinIcon } from "./icons/TrashBinIcon";
import { DragIcon } from "./icons/DragIcon";
import { EyeIcon } from "./icons/EyeIcon";
import { useSession } from "next-auth/react";

/**
 * Подсветка открытой сейчас строки. Собрана в одном месте, потому что её
 * носят и песни, и блоки трапезы в боковой панели — цвет меняется здесь
 * один раз, а не в трёх разметках
 */
export const ACTIVE_ROW_CARD = "bg-[#7D5E42] border border-[#7D5E42]";
export const ACTIVE_ROW_TEXT = "text-white font-semibold";
/** Второстепенное на тёмной заливке: номер песни, автор */
export const ACTIVE_ROW_TEXT_DIM = "text-white/70";

interface SortableSongProps {
  song: any;
  index: number;
  onRemove: (id: string) => void;
  onPreview: (song: any) => void;
  onClick?: () => void; // добавляем optional onClick
  /** Эта песня открыта на экране прямо сейчас — подсвечиваем её в списке */
  isActive?: boolean;
}

export const SortableSong: React.FC<SortableSongProps> = ({
  song,
  index,
  onRemove,
  onPreview,
  onClick,
  isActive = false,
}) => {
  const { data: session } = useSession();
  const isRegent = session?.user?.role === "регент";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.instanceId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} {...(isActive ? { "data-active-row": true } : {})}>
      <Card
        className={`p-3 mb-2 flex-row items-center justify-between gap-4 transition-all duration-200 ${
          isDragging ? "shadow-xl opacity-50" : "shadow-sm hover:shadow-md hover:scale-[1.02]"
        } ${isActive ? ACTIVE_ROW_CARD : ""} cursor-pointer`}
      >
      <Button
              className="w-full bg-transparent"
              onPress={() => {
                onClick();
              }}
            >
        <div className="flex flex-col overflow-hidden w-full">
          <p className={`text-bold text-sm lg:text-base text-left input-header truncate ${isActive ? ACTIVE_ROW_TEXT : ""}`}>
            <span className={`mr-2 ${isActive ? ACTIVE_ROW_TEXT_DIM : "text-default-400"}`}>{index + 1}.</span>
            {song.name}
          </p>
          <p className={`text-left text-bold text-sm lg:text-base input-header justify-center truncate w-full ${isActive ? ACTIVE_ROW_TEXT_DIM : "text-default-500"}`}>
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
                className={`min-w-0 px-3 border transition-all shadow-none ${
                  // На тёмной заливке открытой строки светло-голубая кнопка
                  // выглядела ярким пятном — делаем её полупрозрачно-белой
                  isActive
                    ? "bg-white/15 text-white border-white/35 hover:bg-white/25"
                    : "bg-blue-50 text-blue-400 border-blue-200 hover:bg-blue-100 hover:border-blue-300"
                }`}
              >
                <EyeIcon />
              </Button>
              <Button
                radius="lg"
                size="sm"
                onPress={() => onRemove(song.instanceId)}
                className={`min-w-0 px-3 border transition-all shadow-none ${
                  isActive
                    ? "bg-white/15 text-white border-white/35 hover:bg-white/25"
                    : "bg-red-50 text-red-400 border-red-200 hover:bg-red-100 hover:border-red-300"
                }`}
              >
                {/* Рядом с глазом: у того 20px, а по умолчанию корзина 26px
                    и выглядела крупнее соседа */}
                <TrashBinIcon className="w-5 h-5" />
              </Button>
              <div
                {...attributes}
                {...listeners}
                className={`touch-none select-none cursor-grab active:cursor-grabbing p-1 ${isActive ? "text-white/70 hover:text-white" : "text-default-400 hover:text-default-600"}`}
              >
                <DragIcon />
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
