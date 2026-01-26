"use client";

import React, { useEffect, useState, useRef } from "react";
import { Input } from "@heroui/input";
import { SearchIcon } from "@/components/icons";
import { Button, Card, Pagination } from "@heroui/react";
import { StackContextProvider, useStackContext } from "./StackContextProvider";

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
import { CSS } from "@dnd-kit/utilities";

const SortableSong = ({ song, onRemove }) => {
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
    <div ref={setNodeRef} style={style} className="mb-4 touch-none">
      <Card
        className={`p-3 flex-row items-center justify-between gap-4 ${isDragging ? "shadow-2xl opacity-50" : "shadow-sm"}`}
      >
        <div className="flex flex-col overflow-hidden">
          <p className="text-bold text-sm capitalize text-left input-header truncate">
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
            <svg
              xmlns="http://www.w3.org"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </Button>

          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-default-400 hover:text-default-600"
          >
            <svg
              width="20px"
              height="20px"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.375 3.67c0-.645-.56-1.17-1.25-1.17s-1.25.525-1.25 1.17c0 .646.56 1.17 1.25 1.17s1.25-.524 1.25-1.17zm0 8.66c0-.646-.56-1.17-1.25-1.17s-1.25.524-1.25 1.17c0 .645.56 1.17 1.25 1.17s1.25-.525 1.25-1.17zm-1.25-5.5c.69 0 1.25.525 1.25 1.17 0 .645-.56 1.17-1.25 1.17S4.875 8.645 4.875 8c0-.645.56-1.17 1.25-1.17zm5-3.16c0-.645-.56-1.17-1.25-1.17s-1.25.525-1.25 1.17c0 .646.56 1.17 1.25 1.17s1.25-.524 1.25-1.17zm-1.25 7.49c.69 0 1.25.524 1.25 1.17 0 .645-.56 1.17-1.25 1.17s-1.25-.525-1.25-1.17c0-.646.56-1.17 1.25-1.17zM11.125 8c0-.645-.56-1.17-1.25-1.17s-1.25.525-1.25 1.17c0 .645.56 1.17 1.25 1.17s1.25-.525 1.25-1.17z"
              />
            </svg>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- ОСНОВНОЙ КОМПОНЕНТ ---
export const Sidebar = () => {
  const [songslist, setSongsList] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { stackSongs, setStackSongs } = useStackContext();

  const searchRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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
  const rowsPerPage = 4;
  const pages = Math.ceil(filteredSongs.length / rowsPerPage);

  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  // Обрезаем отфильтрованный список
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
                    onPress={() => handleAddSong(song)}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stackSongs.map((s) => s.instanceId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-6">
              {stackSongs.map((song) => (
                <SortableSong
                  key={song.instanceId}
                  song={song}
                  onRemove={(id) =>
                    setStackSongs((prev) =>
                      prev.filter((s) => s.instanceId !== id)
                    )
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
