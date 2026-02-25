"use client";
export const holidays = [
  { key: "daily", label: "Молитвы на трапезу" },
  { key: "rozhdestvo", label: "Рождество", fullName: "Рождеству Христову" },
  {
    key: "kreshchenie",
    label: "Крещение (Богоявление)",
    fullName: "Крещению Господню",
  },
  { key: "sretenie", label: "Сретение", fullName: "Сретению Господню" },
  {
    key: "blagoveshchenie",
    label: "Благовещение",
    fullName: "Благовещению Пресвятой Богородицы",
  },
  {
    key: "vhod",
    label: "Вход Господень в Иерусалим",
    fullName: "Входу Господню в Иерусалим",
  },
  { key: "pascha", label: "Пасха", fullName: "Пасхе" },
  { key: "voznesenie", label: "Вознесение", fullName: "Вознесению Господню" },
  { key: "troica", label: "Троица", fullName: "Святей Троице" },
  {
    key: "preobrazhenie",
    label: "Преображение",
    fullName: "Преображению Господню",
  },
  {
    key: "uspenie",
    label: "Успение",
    fullName: "Успению Пресвятой Богородицы",
  },
  {
    key: "rozhdestvoBogorodicy",
    label: "Рождество Богородицы",
    fullName: "Рождеству Пресвятой Богородицы",
  },
  {
    key: "vozdvizhenie",
    label: "Воздвижение",
    fullName: "Воздвижению Креста Господня",
  },
  {
    key: "vvedenie",
    label: "Введение",
    fullName: "Введению во храм Пресвятой Богородицы",
  },
];

import React, { useEffect, useState, useRef } from "react";
import { useStackContext } from "./StackContextProvider";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Button,
  useDisclosure,
  Card,
  Pagination,
  ScrollShadow,
  Chip,
  Divider,
} from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { Input } from "@heroui/input";
import { SearchIcon } from "@/components/icons";
import { SortableSong } from "./SortableSong";

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
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
// Removed unused imports: CSS, TrashBinIcon, EmptyIcon, EyePreviewButton, EyeIcon
import { StackIcon } from "@/components/icons/StackIcon";
import { ListIcon } from "./icons/ListIcon";
// import { EmptyIcon } from "../../../components/icons/EmptyIcon";
import { EmptyIcon } from "@/components/icons/EmptyIcon";
import { CopyIcon } from "./icons/CopyIcon";
import DownloadIcon from "@/components/DownloadIcon";
import SideButton from "./icons/SideButton";
import AddSongStackIcon from "./icons/AddSongStackIcon";
import ReserveIcon from "./icons/ReserveIcon";
import SidebarIcon from "./icons/SidebarIcon";
import DownloadPngIcon from "./icons/DownloadPngIcon";
import ProgramDownload from "./ProgramDownload";
import { SidebarButton } from "@/app/stackView/[id]/components/SidebarButton";
// Removed unused import: DownloadIcon

export const Sidebar2 = ({ onPreview }) => {
  const {
    isOpen: isDrawerOpen,
    onOpen: onDrawerOpen,
    onOpenChange: onDrawerChange,
  } = useDisclosure();

  const handleOpen = () => {
    onDrawerOpen();
  };

  const [songslist, setSongsList] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const {
    stackSongs,
    setStackSongs,
    mealType,
    setMealType,
    programSelected,
    setProgramSelected,
  } = useStackContext();

  const searchRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const programRef = useRef<{ handleDownload: () => void }>(null);

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

  const handleAddSong = (song, isReserve = false) => {
    const newSongEntry = {
      ...song,
      instanceId: `${Date.now()}-${Math.random()}`,
      isReserve: !!isReserve,
    };
    setStackSongs((prev) => [...prev, newSongEntry]);

    // Только для песен в резерве
    if (isReserve && !programSelected.includes("reserved")) {
      setProgramSelected((prev) => [...prev, "reserved"]);
    }
  };

  const [activeTab, setActiveTab] = useState("stack"); // "stack" or "program"

  // --- Авто-флаг для резервного чипа: чип снимается один раз, когда резерв пуст, но доступен для повторного включения ---
  const [reserveAutoDisabled, setReserveAutoDisabled] = useState(false);
  useEffect(() => {
    const reserveSongsExist = stackSongs.some((s) => s.isReserve);

    // Если резерв пуст и чип включен и авто-снятие ещё не выполнено
    const isReserveOnly =
      (programSelected.includes("Резерв") && programSelected.length === 1) ||
      (programSelected.includes("reserved") && programSelected.length === 1);

    if (programSelected.includes("reserved") && !reserveSongsExist) {
      setProgramSelected((prev) => {
        return prev.filter((v) => v !== "reserved");
      });
    }
    if (stackSongs.length === 0 && programSelected.length > 0) {
      setProgramSelected([]);
    }

    // Если появились песни в резерве — сбрасываем флаг
    if (reserveSongsExist) {
      setReserveAutoDisabled(false);
    }
  }, [stackSongs, programSelected, reserveAutoDisabled]);

  // Новый handleDragEnd для двух SortableContext
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeSong = stackSongs.find((s) => s.instanceId === active.id);
    if (!activeSong) return;

    // Для контейнеров (перетаскивание на div)
    // Перемещение из основной в резерв
    if (!activeSong.isReserve && over.id === "reserve-drop") {
      setStackSongs((prev) =>
        prev.map((s) =>
          s.instanceId === active.id ? { ...s, isReserve: true } : s,
        ),
      );
      return;
    }
    // Перемещение из резерва в основную
    if (activeSong.isReserve && over.id === "main-drop") {
      setStackSongs((prev) =>
        prev.map((s) =>
          s.instanceId === active.id ? { ...s, isReserve: false } : s,
        ),
      );
      return;
    }

    const overSong = stackSongs.find((s) => s.instanceId === over.id);
    // Перемещение внутри основной стопки
    if (!activeSong.isReserve && overSong && !overSong.isReserve) {
      const mainSongs = stackSongs.filter((s) => !s.isReserve);
      const oldIndex = mainSongs.findIndex((s) => s.instanceId === active.id);
      const newIndex = mainSongs.findIndex((s) => s.instanceId === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const moved = arrayMove(mainSongs, oldIndex, newIndex);
      const reserveSongs = stackSongs.filter((s) => s.isReserve);
      setStackSongs([...moved, ...reserveSongs]);
      return;
    }
    // Перемещение внутри резерва
    if (activeSong.isReserve && overSong && overSong.isReserve) {
      const reserveSongs = stackSongs.filter((s) => s.isReserve);
      const oldIndex = reserveSongs.findIndex(
        (s) => s.instanceId === active.id,
      );
      const newIndex = reserveSongs.findIndex((s) => s.instanceId === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const moved = arrayMove(reserveSongs, oldIndex, newIndex);
      const mainSongs = stackSongs.filter((s) => !s.isReserve);
      setStackSongs([...mainSongs, ...moved]);
      return;
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

  // --- Формирование текста программы для ProgramDownload ---
  const getProgramText = () => {
    const mainSongs = stackSongs.filter((song) => !song.isReserve);
    const reserveSongs = stackSongs.filter((song) => song.isReserve);

    const songInfoText = (song) => {
      let lines = [];

      if (programSelected.includes("Музыка") && song.author) {
        lines.push(`муз. ${song.author}`);
      }
      if (programSelected.includes("Слова") && song.authorLyrics) {
        if (song.author === song.authorLyrics) {
          lines.push(`сл. и муз. ${song.author}`);
        } else {
          // добавляем автора музыки только если чип "Музыка" активен
          lines.push(
            `сл. ${song.authorLyrics}${programSelected.includes("Музыка") && song.author ? `, муз. ${song.author}` : ""}`,
          );
        }
      }
      // больше не добавляем автора музыки по умолчанию
      if (programSelected.includes("Аранжировка") && song.authorArrange) {
        lines.push(`аранж. ${song.authorArrange}`);
      }
      return lines;
    };

    let text = "";

    if (mainSongs.length > 0) {
      text += "Программа:\n";
      mainSongs.forEach((song, idx) => {
        text += `${idx + 1}. ${song.name}\n`;
        songInfoText(song).forEach((line) => {
          text += `   ${line}\n`;
        });
      });
    }

    if (reserveSongs.length > 0) {
      text += (mainSongs.length > 0 ? "\n" : "") + "Резерв:\n";
      reserveSongs.forEach((song, idx) => {
        text += `${idx + 1}. ${song.name}\n`;
        songInfoText(song).forEach((line) => {
          text += `   ${line}\n`;
        });
      });
    }

    return text || "Песен нет";
  };

  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY < lastScrollY) {
        // прокрутка вверх
        setShowButton(true);
      } else if (currentY > lastScrollY) {
        // прокрутка вниз
        setShowButton(false);
      }

      setLastScrollY(currentY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <div
          className={`fixed left-3 z-20 transform-gpu transition-all duration-50
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
        >
          <SidebarButton onPress={() => handleOpen()} />
        </div>
      </div>
      <Drawer
        isOpen={isDrawerOpen}
        placement="left"
        onOpenChange={onDrawerChange}
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        hideCloseButton
        classNames={{
          base: "sm:data-[placement=right]:m-2 sm:data-[placement=left]:m-2  rounded-medium",
        }}
      >
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader
                className="absolute top-0 inset-x-0 z-50
    flex items-center justify-between
    h-12
    px-4
    border-b border-default-200/50
    bg-content1/50 backdrop-blur-lg"
              >
                <div className="flex w-full px-2 gap-2 input-header">
                  <Button
                    className={` font-medium text-small ${
                      activeTab === "stack"
                        ? "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white"
                        : "text-default-500"
                    }`}
                    size="sm"
                    startContent={<StackIcon />}
                    variant="flat"
                    onClick={() => setActiveTab("stack")}
                  >
                    Стопка
                  </Button>
                  {stackSongs.length > 0 && (
                    <Button
                      className={`font-medium text-small ${
                        activeTab === "program"
                          ? "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white"
                          : "text-default-500"
                      }`}
                      startContent={<ListIcon />}
                      size="sm"
                      variant="flat"
                      onClick={() => setActiveTab("program")}
                    >
                      Программа
                    </Button>
                  )}
                </div>
                <Button
                  isIconOnly
                  className="text-default-400 rotate-180"
                  size="sm"
                  variant="light"
                  onPress={onClose}
                >
                  <SideButton />
                </Button>
              </DrawerHeader>
              <DrawerBody className="flex flex-col h-[calc(100vh-60px)] overflow-hidden">
                {/* Табы */}
                {activeTab === "stack" && (
                  <div
                    ref={searchRef}
                    className="relative w-full flex flex-col flex-1 min-h-0 mt-10"
                  >
                    <div className="relative shrink-0 z-50">
                      <Input
                        type="search"
                        placeholder="Введите название или автора"
                        value={searchValue}
                        onChange={(e) => {
                          setSearchValue(e.target.value);
                          setIsOpen(true);
                        }}
                        isClearable
                        onClear={() => setSearchValue("")}
                        onFocus={() => setIsOpen(true)}
                        startContent={
                          <SearchIcon className="text-default-400 mr-2" />
                        }
                        className="mt-4 w-full text-center justify-center font-header gap-4"
                        classNames={{
                          inputWrapper: "bg-[#FFFAF5] rounded-md",
                          input: "text-sm pl-2",
                          clearButton: "text-[#BD9673] hover:text-[#7D5E42]",
                        }}
                      />

                      {searchValue.length > 0 && isOpen && (
                        <Card className="p-2 bg-white border border-default-200 shadow-sm mt-8 absolute left-0 right-0  z-50 mx-auto w-[95%] max-w-[350px] ">
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
                                  <div className="flex gap-3">
                                    {/* Добавление в обычную стопку */}
                                    <Button
                                      radius="full"
                                      isIconOnly
                                      variant="shadow"
                                      size="md"
                                      onPress={() => handleAddSong(song, false)}
                                      className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white hover:opacity-90"
                                    >
                                      <AddSongStackIcon />
                                    </Button>
                                    {/* Добавление в резерв — только если выбран чип "Резерв" */}
                                    {(programSelected.includes("Резерв") ||
                                      programSelected.includes("reserved")) && (
                                      <Button
                                        radius="full"
                                        isIconOnly
                                        variant="shadow"
                                        size="md"
                                        className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white hover:opacity-90"
                                        onPress={() =>
                                          handleAddSong(song, true)
                                        }
                                      >
                                        <ReserveIcon />
                                      </Button>
                                    )}
                                  </div>
                                </Card>
                              ))
                            ) : (
                              <div className="py-10 text-center">
                                <div className="mx-auto w-16 h-16 mb-4 text-gray-300">
                                  <EmptyIcon />
                                </div>
                                <p className="input-header text-gray-500 text-lg font-medium mb-2">
                                  Ничего не найдено
                                </p>
                                <p className="input-header text-gray-400 text-sm">
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
                    </div>

                    {stackSongs && stackSongs.length > 0 && (
                      <Card
                        className="mt-8 p-2 pt-4 flex-1 min-h-0 flex flex-col mb-4
      bg-white/40 backdrop-blur-md border border-default-200 shadow-sm rounded-2xl"
                      >
                        <div className="flex items-center justify-between px-2 mb-2">
                          <span className="text-xs main-font font-bold uppercase tracking-wider text-default-500">
                            Ваша стопка
                          </span>
                          <div className="flex gap-2">
                            <Chip
                              size="sm"
                              color="primary"
                              variant="flat"
                              className={`cursor-pointer input-header border 
                                px-2 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-sm 
                                rounded-full
                                ${programSelected.includes("Трапеза") ? "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white" : "bg-transparent text-default-500 border-default-300"}
                              `}
                              onClick={() => {
                                setProgramSelected((prev) =>
                                  prev.includes("Трапеза")
                                    ? prev.filter((v) => v !== "Трапеза")
                                    : [...prev, "Трапеза"],
                                );
                              }}
                            >
                              Трапеза
                            </Chip>
                            <Chip
                              size="sm"
                              color="primary"
                              variant="flat"
                              className={`cursor-pointer input-header border 
                                px-2 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-sm 
                                rounded-full
                                ${programSelected.includes("Резерв") || programSelected.includes("reserved") ? "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white" : "bg-transparent text-default-500 border-default-300"}
                              `}
                              onClick={() => {
                                if (
                                  programSelected.includes("Резерв") ||
                                  programSelected.includes("reserved")
                                ) {
                                  setStackSongs((prev) =>
                                    prev.filter((s) => !s.isReserve),
                                  );
                                  setProgramSelected((prev) =>
                                    prev.filter((v) => v !== "Резерв"),
                                  );
                                } else {
                                  setProgramSelected((prev) => [
                                    ...prev,
                                    "Резерв",
                                  ]);
                                }
                              }}
                            >
                              Резерв
                            </Chip>
                          </div>
                        </div>
                        <Divider
                          className="mt-1"
                          style={{ borderColor: "#BD9673" }}
                        />
                        {/* {stackSongs.some((s) => !s.isReserve) && (
                          
                        )} */}
                        <div className="flex-1 relative min-h-0 mt-2">
                          <ScrollShadow
                            hideScrollBar
                            className="absolute inset-0 px-1"
                            size={40}
                          >
                            <div className="flex items-center my-3 select-none pointer-events-none">
                              <div className="flex-1 h-px bg-gradient-to-l from-[#7D5E42]/50 to-transparent" />
                              <span className="px-3 py-1 text-xs input-header uppercase tracking-wider font-bold text-[#7D5E42] bg-white/20 rounded-md">
                                Программа
                              </span>
                              <div className="flex-1 h-px bg-gradient-to-r from-[#7D5E42]/50 to-transparent" />
                            </div>
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
                              {/* Основная стопка */}
                              <SortableContext
                                items={stackSongs
                                  .filter((s) => !s.isReserve)
                                  .map((s) => s.instanceId)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div id="main-drop" className="mb-4">
                                  {programSelected.includes("Трапеза") && (
                                    <Card className="p-3 mt-1 mb-3 shadow-sm bg-white border border-default-200 rounded-xl pointer-events-none w-[85%] ml-auto">
                                      <div className="flex flex-col gap-2">
                                        <p className="text-sm input-header">
                                          Трапеза (начало)
                                        </p>
                                        <Select
                                          className="max-w-xs pointer-events-auto input-header"
                                          placeholder="Выберите вариант"
                                          selectedKeys={
                                            mealType ? [mealType] : []
                                          }
                                          onSelectionChange={(keys) => {
                                            const value = Array.from(
                                              keys,
                                            )[0] as string;
                                            setMealType(value);
                                          }}
                                        >
                                          {holidays.map((holiday) => (
                                            <SelectItem key={holiday.key}>
                                              {holiday.label}
                                            </SelectItem>
                                          ))}
                                        </Select>
                                      </div>
                                    </Card>
                                  )}
                                  {stackSongs
                                    .filter((s) => !s.isReserve)
                                    .map((song, index) => (
                                      <SortableSong
                                        key={song.instanceId}
                                        song={song}
                                        index={index}
                                        onPreview={onPreview}
                                        onRemove={(id) =>
                                          setStackSongs((prev) =>
                                            prev.filter(
                                              (s) => s.instanceId !== id,
                                            ),
                                          )
                                        }
                                      />
                                    ))}
                                  {programSelected.includes("Трапеза") && (
                                    <Card className="p-3 mt-1 mb-1 shadow-sm bg-white border border-default-200 rounded-xl pointer-events-none w-[85%] ml-auto">
                                      <div className="flex flex-col gap-2">
                                        <p className="text-sm input-header">
                                          Трапеза (конец)
                                        </p>
                                      </div>
                                    </Card>
                                  )}
                                </div>
                              </SortableContext>
                              {/* Резерв */}
                              {stackSongs.some((s) => s.isReserve) && (
                                <SortableContext
                                  items={stackSongs
                                    .filter((s) => s.isReserve)
                                    .map((s) => s.instanceId)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div id="reserve-drop">
                                    <div className="flex items-center my-3 select-none pointer-events-none">
                                      <div className="flex-1 h-px bg-gradient-to-l from-[#7D5E42]/50 to-transparent" />
                                      <span className="px-3 py-1 text-xs input-header uppercase tracking-wider font-bold text-[#7D5E42] bg-white/20 rounded-md">
                                        Резерв
                                      </span>
                                      <div className="flex-1 h-px bg-gradient-to-r from-[#7D5E42]/50 to-transparent" />
                                    </div>
                                    {stackSongs
                                      .filter((s) => s.isReserve)
                                      .map((song, index) => (
                                        <SortableSong
                                          key={song.instanceId}
                                          song={song}
                                          index={index}
                                          onPreview={onPreview}
                                          onRemove={(id) =>
                                            setStackSongs((prev) =>
                                              prev.filter(
                                                (s) => s.instanceId !== id,
                                              ),
                                            )
                                          }
                                        />
                                      ))}
                                  </div>
                                </SortableContext>
                              )}
                            </DndContext>
                          </ScrollShadow>
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {activeTab === "program" && (
                  <>
                    <div className="mt-12 flex items-center justify-between flex-nowrap">
                      <div className="flex gap-2 items-center">
                        {["Музыка", "Слова", "Аранжировка"].map((item) => (
                          <Chip
                            size="sm"
                            key={item}
                            color="primary"
                            variant="flat"
                            className={`cursor-pointer input-header border 
                                        px-2 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-sm 
                                        rounded-full
                                        ${
                                          programSelected.includes(item)
                                            ? "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white"
                                            : "bg-transparent text-default-500 border-default-300"
                                        }`}
                            onClick={() => {
                              setProgramSelected((prev) =>
                                prev.includes(item)
                                  ? prev.filter((v) => v !== item)
                                  : [...prev, item],
                              );
                            }}
                          >
                            {item}
                          </Chip>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          isIconOnly
                          className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white"
                          onClick={() => {
                            const text = getProgramText();
                            navigator.clipboard.writeText(text.trim());
                          }}
                        >
                          <CopyIcon size={22} />
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          isIconOnly
                          className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white"
                          onClick={() => programRef.current?.handleDownload()}
                        >
                          <DownloadPngIcon />
                        </Button>
                        <ProgramDownload
                          ref={programRef}
                          backgroundUrl="/ProgramCover.png"
                          programText={getProgramText()}
                        />
                      </div>
                    </div>
                    <Card
                      className="mt-0 p-4 bg-white/40 backdrop-blur-md border border-default-200 shadow-sm rounded-2xl 
               flex-1 min-h-0 flex flex-col mb-4 pt-2"
                    >
                      <div className="flex flex-col gap-3 text-left flex-1 min-h-0">
                        <div className="flex-1 relative min-h-0 mt-2">
                          <ScrollShadow
                            hideScrollBar
                            className="absolute inset-0 px-1"
                            size={40}
                          >
                            <div className="flex flex-col gap-2 pb-4">
                              {stackSongs.length > 0 ? (
                                <>
                                  {stackSongs.filter((song) => !song.isReserve)
                                    .length > 0 && (
                                    <div className="flex items-center my-3 select-none pointer-events-none">
                                      <div className="flex-1 h-px bg-gradient-to-l from-[#7D5E42]/50 to-transparent" />
                                      <span className="px-3 py-1 text-xs input-header uppercase tracking-wider font-bold text-[#7D5E42] bg-white/20 rounded-md">
                                        Программа
                                      </span>
                                      <div className="flex-1 h-px bg-gradient-to-r from-[#7D5E42]/50 to-transparent" />
                                    </div>
                                  )}
                                  {stackSongs
                                    .filter((song) => !song.isReserve)
                                    .map((song, index) => (
                                      <div
                                        key={song.instanceId}
                                        className="flex flex-col  gap-1 p-2 rounded-md bg-white/50"
                                      >
                                        <span className="input-header">
                                          {index + 1}. {song.name}
                                        </span>
                                        <span className="text-sm input-header text-default-500">
                                          {programSelected.includes("Музыка") &&
                                          song.author
                                            ? `муз. ${song.author}`
                                            : ""}
                                          {programSelected.includes("Слова") &&
                                          song.authorLyrics
                                            ? song.author === song.authorLyrics
                                              ? `${programSelected.includes("Музыка") ? ", " : ""}сл. и муз. ${song.author}`
                                              : `${programSelected.includes("Музыка") ? ", " : ""}сл. ${song.authorLyrics}${programSelected.includes("Музыка") && song.author ? `, муз. ${song.author}` : ""}`
                                            : ""}
                                          {programSelected.includes(
                                            "Аранжировка",
                                          ) && song.authorArrange
                                            ? `${(programSelected.includes("Музыка") && song.author) || (programSelected.includes("Слова") && song.authorLyrics) ? ", " : ""}аранж. ${song.authorArrange}`
                                            : ""}
                                        </span>
                                      </div>
                                    ))}

                                  {stackSongs.filter((song) => song.isReserve)
                                    .length > 0 && (
                                    <>
                                      <div className="flex items-center my-3 select-none pointer-events-none">
                                        <div className="flex-1 h-px bg-gradient-to-l from-[#7D5E42]/50 to-transparent" />
                                        <span className="px-3 py-1 text-xs input-header uppercase tracking-wider font-bold text-[#7D5E42] bg-white/20 rounded-md">
                                          Резерв
                                        </span>
                                        <div className="flex-1 h-px bg-gradient-to-r from-[#7D5E42]/50 to-transparent" />
                                      </div>
                                      {stackSongs
                                        .filter((song) => song.isReserve)
                                        .map((song, index) => (
                                          <div
                                            key={song.instanceId}
                                            className="flex flex-col gap-1 p-2 rounded-md bg-white/50"
                                          >
                                            <span className="input-header">
                                              {index + 1}. {song.name}
                                            </span>
                                            <span className="text-sm input-header text-default-500">
                                              {programSelected.includes(
                                                "Музыка",
                                              ) && song.author
                                                ? `муз. ${song.author}`
                                                : ""}
                                              {programSelected.includes(
                                                "Слова",
                                              ) && song.authorLyrics
                                                ? song.author ===
                                                  song.authorLyrics
                                                  ? `${programSelected.includes("Музыка") ? ", " : ""}сл. и муз. ${song.author}`
                                                  : `${programSelected.includes("Музыка") ? ", " : ""}сл. ${song.authorLyrics}${programSelected.includes("Музыка") && song.author ? `, муз. ${song.author}` : ""}`
                                                : ""}
                                              {programSelected.includes(
                                                "Аранжировка",
                                              ) && song.authorArrange
                                                ? `${(programSelected.includes("Музыка") && song.author) || (programSelected.includes("Слова") && song.authorLyrics) ? ", " : ""}аранж. ${song.authorArrange}`
                                                : ""}
                                            </span>
                                          </div>
                                        ))}
                                    </>
                                  )}
                                </>
                              ) : (
                                <p className="text-gray-500 text-center">
                                  Песен нет
                                </p>
                              )}
                            </div>
                          </ScrollShadow>
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};
