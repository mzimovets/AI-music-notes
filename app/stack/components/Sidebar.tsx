"use client";

import React, { useEffect, useState, useRef } from "react";
import { Input } from "@heroui/input";
import { SearchIcon } from "@/components/icons";
import { Button, Card, Pagination, ScrollShadow } from "@heroui/react";
import { useStackContext } from "./StackContextProvider";

// DND Kit
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { TrashBinIcon } from "./icons/TrashBinIcon";
import { EmptyIcon } from "./icons/DragIcon";

const SortableSong = ({ song, onRemove, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: song.instanceId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-none select-none">
      <Card
        className={`p-3 mb-2 flex-row items-center justify-between gap-4 ${isDragging ? "shadow-xl opacity-50" : "shadow-sm"}`}
      >
        <div className="flex flex-col overflow-hidden">
          <p className="text-bold text-sm capitalize text-left input-header truncate">
            <span className="mr-2 text-default-400">{index + 1}.</span>
            {song.name}
          </p>
          <p className="text-bold text-sm capitalize input-header justify-center text-default-500 truncate">
            {song.author}
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            <EmptyIcon />
          </div>
        </div>
      </Card>
    </div>
  );
};

export const Sidebar = () => {
  const [songslist, setSongsList] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { stackSongs, setStackSongs } = useStackContext();

  const searchRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const getSongs = async () => {
    try {
      const response = await fetch("http://localhost:4000/songs");
      const data = await response.json();
      setSongsList(data.docs || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getSongs();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddSong = (song) => {
    const newSongEntry = {
      ...song,
      instanceId: `${Date.now()}-${Math.random()}`,
    };
    setStackSongs((prev) => [...prev, newSongEntry]);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setStackSongs((items) => {
        const oldIndex = items.findIndex((i) => i.instanceId === active.id);
        const newIndex = items.findIndex((i) => i.instanceId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const filteredSongs = songslist?.filter((song) => {
    const search = searchValue.toLowerCase();
    return (
      song.name.toLowerCase().includes(search) ||
      song.author.toLowerCase().includes(search)
    );
  });

  const [page, setPage] = useState(1);
  useEffect(() => {
    if (isOpen) setPage(1);
  }, [isOpen]);
  const rowsPerPage = 4;
  const pages = Math.ceil(filteredSongs.length / rowsPerPage);

  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const items = filteredSongs.slice(start, end);

  return (
    <div ref={searchRef} className="relative w-full">
      <Input
        type="search"
        placeholder="Поиск"
        value={searchValue}
        onChange={(e) => {
          setSearchValue(e.target.value);
          setIsOpen(true);
        }}
        isClearable
        onClear={() => setSearchValue("")}
        onFocus={() => setIsOpen(true)}
        startContent={<SearchIcon className="text-default-400 mr-2" />}
        className="mt-4 w-full text-center justify-center font-header gap-4"
        classNames={{
          inputWrapper: "bg-[#FFFAF5] rounded-md",
          input: "text-sm pl-2",
          clearButton: "text-[#BD9673] hover:text-[#7D5E42]",
        }}
      />

      {searchValue.length > 0 && isOpen && (
        <Card className="p-2 bg-white border border-default-200 shadow-sm mt-4 absolute z-50 w-full">
          <div className="flex flex-col gap-3 w-full">
            {filteredSongs && filteredSongs.length > 0 ? (
              items.map((song) => (
                <Card
                  key={song._id}
                  className="p-3 flex-row items-center justify-between gap-4"
                >
                  <div className="flex flex-col overflow-hidden">
                    <p className="text-bold text-sm capitalize text-left input-header">
                      {song.name}
                    </p>
                    <p className="text-bold text-sm capitalize input-header justify-center text-default-500">
                      {song.author}
                    </p>
                  </div>
                  <Button
                    radius="full"
                    isIconOnly
                    variant="shadow"
                    size="sm"
                    onPress={() =>
                      handleAddSong(song, window.location.pathname)
                    }
                  >
                    +
                  </Button>
                </Card>
              ))
            ) : (
              <div className="py-10 text-center">
                <div className="mx-auto w-16 h-16 mb-4 text-gray-300">
                  <svg
                    xmlns="http://www.w3.org"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium mb-2">
                  Ничего не найдено
                </p>
                <p className="text-gray-400 text-sm">
                  Попробуйте изменить запрос
                </p>
              </div>
            )}
          </div>
          {filteredSongs.length > rowsPerPage && (
            <Pagination
              page={page}
              total={pages}
              onChange={setPage}
              className=" pt-6"
              classNames={{
                wrapper: "font-header",
                item: [
                  "font-pagination",
                  "text-gray-700",
                  "data-[hover=true]:text-white",
                  "data-[hover=true]:bg-gradient-to-r",
                  "data-[hover=true]:from-[#BD9673]",
                  "data-[hover=true]:to-[#7D5E42]",
                ].join(" "),
                cursor: [
                  "font-pagination",
                  "bg-gradient-to-r from-[#BD9673] to-[#7D5E42]",
                  "text-white",
                  "font-bold",
                ].join(" "),
              }}
            />
          )}
        </Card>
      )}

      {stackSongs && stackSongs.length > 0 && (
        <Card className="mt-8 p-2 pt-4 bg-white/40 backdrop-blur-md border border-default-200 shadow-sm overflow-visible rounded-2xl">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs main-font font-bold uppercase tracking-wider text-default-400">
              Ваша стопка
            </span>
            <span className="text-[10px] bg-default-100 px-2 py-0.5 rounded-full text-default-500">
              Drag & Drop
            </span>
          </div>

          <ScrollShadow
            hideScrollBar
            className="max-h-[450px] overflow-y-auto overflow-x-visible px-1"
            size={40}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[
                restrictToVerticalAxis,
                restrictToWindowEdges,
                restrictToParentElement,
              ]}
            >
              <SortableContext
                items={stackSongs.map((s) => s.instanceId)}
                strategy={verticalListSortingStrategy}
              >
                {/* gap-1 делает расстояние между карточками меньше */}
                <div className="flex flex-col gap-1 relative min-h-[50px]">
                  {stackSongs.map((song, index) => (
                    <SortableSong
                      key={song.instanceId}
                      song={song}
                      index={index}
                      onRemove={(id) =>
                        setStackSongs((prev) =>
                          prev.filter((s) => s.instanceId !== id),
                        )
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollShadow>
        </Card>
      )}
    </div>
  );
};
