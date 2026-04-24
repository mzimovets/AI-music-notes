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
import { useSession } from "next-auth/react";
import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
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
  Popover,
  PopoverTrigger,
  PopoverContent,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { Input } from "@heroui/input";
import { SearchIcon } from "@/components/icons";
import { SortableSong } from "@/app/stack/[id]/components/SortableSong";

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
import { ListIcon } from "@/app/stack/[id]/components/icons/ListIcon";
// import { EmptyIcon } from "../../../components/icons/EmptyIcon";

import { EmptyIcon } from "@/components/icons/EmptyIcon";
import CopyIcon from "@/app/stack/[id]/components/icons/CopyIcon";

import SideButton from "@/app/stack/[id]/components/icons/SideButton";
import AddSongStackIcon from "@/app/stack/[id]/components/icons/AddSongStackIcon";
import ReserveIcon from "@/app/stack/[id]/components/icons/ReserveIcon";
import SidebarIcon from "@/app/stack/[id]/components/icons/SidebarIcon";
import DownloadIcon from "@/components/DownloadIcon";
import ProgramDownload from "@/app/stack/[id]/components/ProgramDownload";
import DownloadPngIcon from "@/app/stack/[id]/components/icons/DownloadPngIcon";
import { TrashBinIcon } from "@/app/stack/[id]/components/icons/TrashBinIcon";
import { updateStack } from "@/actions/actions";
import { recacheStack } from "@/lib/recache";
import { useParams } from "next/navigation";
import { SaveIcon } from "@/app/stack/[id]/components/icons/SaveIcon";
import { UnpublishIcon } from "@/app/stack/[id]/components/icons/UnpublishIcon";
import { DeleteModal } from "./DeleteModal";
import { SidebarButton } from "./SidebarButton";
import { socket } from "@/lib/socket";
import { useRouter } from "next/navigation";
import { getBackendBaseUrl } from "@/lib/client-url";
// Removed unused import: DownloadIcon

export const SideBarStack = ({
  onPreview,
  viewMode,
  onViewModeChange,
  goToPage,
  mainSongPages,
  reserveSongPages,
  trapezaStartPage,
  trapezaEndPage,
  forceVisible,
}: {
  onPreview: (song: any) => void;
  viewMode: "scroll" | "book";
  onViewModeChange: (mode: "scroll" | "book") => void;
  goToPage?: (page: number) => void;
  mainSongPages?: number[];
  reserveSongPages?: number[];
  trapezaStartPage?: number;
  trapezaEndPage?: number;
  /** В режиме книги видимость управляется снаружи (тап по экрану) */
  forceVisible?: boolean;
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const isRegent = session?.user?.role === "регент";
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // После useState для isDrawerOpen
useEffect(() => {
  const handleMiddle = () => setIsDrawerOpen(prev => !prev);
  window.addEventListener('clicker:middle', handleMiddle);
  return () => window.removeEventListener('clicker:middle', handleMiddle);
}, []);

  const handleSongClick = (songId: string, bookPage?: number) => {
    setIsDrawerOpen(false);

    if (viewMode === "book") {
      if (bookPage !== undefined && goToPage) {
        setTimeout(() => goToPage(bookPage), 450);
      }
      return;
    }

    // небольшая задержка, чтобы drawer успел закрыться
    setTimeout(() => {
      const el = document.getElementById(songId);
      if (el) {
        const y = el.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 250);
  };
  const handleOpen = () => {
    setIsDrawerOpen(true);
  };

  const [songslist, setSongsList] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const {
    stackResponse,
    stackSongs,
    removeSong,
    setStackSongs,
    mealType,
    setMealType,
    programSelected,
    setProgramSelected,
  } = useStackContext();
  const stackId = stackResponse?.doc?._id;
  const isInitialSyncSkippedRef = useRef(false);

  useEffect(() => {
    isInitialSyncSkippedRef.current = false;
  }, [stackId]);

  useEffect(() => {
    if (!isRegent || !stackId) return;

    if (!isInitialSyncSkippedRef.current) {
      isInitialSyncSkippedRef.current = true;
      return;
    }

    socket.emit("stack-updated", {
      stackId,
      songs: stackSongs,
      mealType,
    });
  }, [isRegent, mealType, stackId, stackSongs]);

  const searchRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const programRef = useRef<{ handleDownload: () => void }>(null);

  // TODO: выенсти
  const getSongs = async () => {
    try {
      const response = await fetch(`${getBackendBaseUrl()}/songs`);
      const data = await response.json();
      setSongsList(data.docs || []);
    } catch (e) {
      console.error(e);
    }
  };

  // TODO: выенсти
  useEffect(() => {
    getSongs();
  }, []);

  // TODO: выенсти
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
      const musicSelected = programSelected.includes("Музыка") && song.author;
      const lyricsSelected =
        programSelected.includes("Слова") && song.authorLyrics;
      const arrangeSelected =
        programSelected.includes("Аранжировка") && song.authorArrange;

      let parts: string[] = [];

      if (
        musicSelected &&
        lyricsSelected &&
        song.author === song.authorLyrics
      ) {
        parts.push(`сл. и муз. ${song.author}`);
      } else {
        if (musicSelected) parts.push(`муз. ${song.author}`);
        if (lyricsSelected) parts.push(`сл. ${song.authorLyrics}`);
      }

      if (arrangeSelected) parts.push(`аранж. ${song.authorArrange}`);

      return parts;
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

  const params = useParams<{ id: string }>();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const save = async () => {
    await updateStack({
      stack: stackSongs,
      mealType,
      programSelected,
      isPublished: true,
      currentUrl: window.location.pathname,
      id: params.id,
      name: stackResponse.doc?.name,
    });
    await recacheStack(params.id);
    socket.emit("stack-visibility-changed", {
      stackId: params.id,
      isPublished: true,
      stackData: {
        _id: params.id,
        name: stackResponse.doc?.name,
        songs: stackSongs,
        mealType,
        programSelected,
        isPublished: true,
        docType: "stack",
      },
    });
    router.push("/");
  };

  const unpublish = async () => {
    await updateStack({
      stack: stackSongs,
      mealType,
      programSelected,
      isPublished: false,
      currentUrl: window.location.pathname,
      id: params.id,
      name: stackResponse.doc?.name,
    });
    await recacheStack(params.id);
    socket.emit("stack-visibility-changed", { stackId: params.id, isPublished: false });
    setIsUnpublishModalOpen(false);
    router.push("/");
  };

  // TODO: в мобильном виде уменьшить карточки с песнями dnd, чтобы была область для скролла
  // В Sidebar2 тоже

  // TODO: в Поиске на главном экране убрать зум в мобильном виде
  // TODO: Добавить скролл в мобильном виде в модальное окно Добавить стопку
  return (
    <>
      <DeleteModal
        isDeleteModalOpen={isDeleteModalOpen}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
      />

      <Modal
        isOpen={isUnpublishModalOpen}
        onOpenChange={setIsUnpublishModalOpen}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col items-center text-center gap-2">
                <h3 className="text-xl font-bold text-gray-900 card-header">
                  Снять с публикации
                </h3>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-3">
                  <p className="text-gray-600 input-header text-sm">
                    Стопка{" "}
                    <span className="font-semibold text-gray-900">
                      "{stackResponse.doc?.name}"
                    </span>{" "}
                    станет сохранённой и пропадёт у певчих.
                  </p>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm font-semibold text-amber-800 input-header flex items-center gap-2">
                      <span>⚠️</span> Певчие потеряют доступ к стопке
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={onClose}
                  className="input-header"
                >
                  Отмена
                </Button>
                <Button
                  onPress={unpublish}
                  className="input-header bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white"
                >
                  Снять с публикации
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <div className="flex flex-wrap gap-3">
        <div
          className={`fixed left-3 top-2 z-50 transform-gpu transition-all duration-200
          ${(forceVisible !== undefined ? forceVisible : showButton) ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
        >
          <SidebarButton onPress={() => handleOpen()} />
        </div>
      </div>
      <Drawer
        isOpen={isDrawerOpen}
        placement="left"
        onOpenChange={setIsDrawerOpen}
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        hideCloseButton
        classNames={{
          base: "sm:data-[placement=right]:m-2 sm:data-[placement=left]:m-2  rounded-medium",
        }}
      >
        <DrawerContent onClose={() => setIsDrawerOpen(false)}>
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
                {/* View mode toggle */}
                <div className="flex gap-0.5 items-center p-0.5 bg-default-100 rounded-lg mx-2">
                  <button
                    title="Листание"
                    onClick={() => onViewModeChange("scroll")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "scroll"
                        ? "bg-white text-[#7D5E42] shadow-sm"
                        : "text-default-400 hover:text-default-600"
                    }`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="3" y1="12" x2="21" y2="12"/>
                      <line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                  <button
                    title="Книга"
                    onClick={() => onViewModeChange("book")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "book"
                        ? "bg-white text-[#7D5E42] shadow-sm"
                        : "text-default-400 hover:text-default-600"
                    }`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                  </button>
                </div>

                <div className="flex gap-2 items-center">
                  {session?.user?.role === "регент" && (
                    <Popover
                      isOpen={isActionsOpen}
                      onOpenChange={setIsActionsOpen}
                      placement="bottom-end"
                      showArrow
                    >
                      <PopoverTrigger>
                        <Button
                          radius="lg"
                          size="sm"
                          isIconOnly
                          className="min-w-0 px-2 bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-none"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="5" cy="12" r="2"/>
                            <circle cx="12" cy="12" r="2"/>
                            <circle cx="19" cy="12" r="2"/>
                          </svg>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-1.5 min-w-[180px]">
                        <div className="flex flex-col gap-0.5 w-full">
                          <Button
                            size="sm"
                            variant="flat"
                            className="justify-start h-9 px-3 gap-2.5 input-header text-sm text-[#7D5E42] bg-transparent hover:bg-[#F7F0EA]"
                            startContent={<UnpublishIcon size={18} color="#7D5E42" />}
                            onPress={() => {
                              setIsActionsOpen(false);
                              setIsUnpublishModalOpen(true);
                            }}
                          >
                            Снять с публикации
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            className="justify-start h-9 px-3 gap-2.5 input-header text-sm text-green-600 bg-transparent hover:bg-green-50"
                            startContent={<SaveIcon size={18} />}
                            onPress={() => {
                              setIsActionsOpen(false);
                              save();
                            }}
                          >
                            Сохранить
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            className="justify-start h-9 px-3 gap-2.5 input-header text-sm text-red-400 bg-transparent hover:bg-red-50"
                            startContent={<TrashBinIcon />}
                            onPress={() => {
                              setIsActionsOpen(false);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            Удалить
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  <Button
                    isIconOnly
                    className="text-default-400 rotate-180"
                    size="sm"
                    variant="light"
                    onPress={onClose}
                  >
                    <SideButton />
                  </Button>
                </div>
              </DrawerHeader>
              <DrawerBody className="flex flex-col h-[calc(100vh-60px)] overflow-hidden">
                {/* Табы */}
                {activeTab === "stack" && (
                  <div
                    ref={searchRef}
                    className={`relative w-full flex flex-col flex-1 min-h-0 ${
                      session?.user?.role === "регент" ? "mt-10" : "mt-13"
                    }`}
                  >
                    <div className="relative shrink-0 z-50">
                      {session?.user?.role === "регент" && (
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
                      )}

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
                      // в мобильной версии надо сузить
                        className="mt-8 p-2 pt-4 flex-1 min-h-0 flex flex-col mb-4
      bg-white/40 backdrop-blur-md border border-default-200 shadow-sm rounded-2xl"
                      >
                        <div className="flex items-center justify-between px-2 mb-2">
                          <span className="text-xs main-font font-bold uppercase tracking-wider text-default-500">
                            Ваша стопка
                          </span>
                          <div className="flex gap-2">
                            {session?.user?.role === "регент" && (
                              <>
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
                              </>
                            )}
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
                            <div className="flex items-center my-3 select-none">
                              <div className="flex-1 h-px bg-gradient-to-l from-[#7D5E42]/50 to-transparent" />
                              <button
                                onClick={() => handleSongClick(`program`)}
                                className="cursor-pointer px-3 py-1 text-xs input-header uppercase tracking-wider font-bold text-[#7D5E42] bg-white/20 rounded-md"
                              >
                                Программа
                              </button>
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
                                    <div
                                      className={`touch-none select-none w-[85%] ml-auto p-3 shadow-sm bg-white border border-default-200 rounded-xl mt-1 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${session?.user?.role === "регент" ? "flex flex-col gap-2 mb-3 min-h-[100px] items-start" : "mb-2"}`}
                                      onClick={() =>
                                        handleSongClick(`meal_start`, trapezaStartPage)
                                      }
                                    >
                                      <p className="text-sm input-header m-0 text-left">
                                        Трапеза (начало)
                                      </p>
                                      {session?.user?.role === "регент" && (
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
                                      )}
                                    </div>
                                  )}
                                  {stackSongs
                                    .filter((s) => !s.isReserve)
                                    .map((song, index) => (
                                      <SortableSong
                                        key={song.instanceId}
                                        song={song}
                                        index={index}
                                        onClick={() => {
                                          handleSongClick(
                                            `${song._id}_${index}`,
                                            mainSongPages?.[index],
                                          );
                                        }}
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
                                    <div
                                      className="touch-none select-none w-[85%] ml-auto p-3 mt-1 mb-1 shadow-sm bg-white border border-default-200 rounded-xl items-start cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                                      onClick={() =>
                                        handleSongClick(`meal_end`, trapezaEndPage)
                                      }
                                    >
                                      <p className="text-sm input-header m-0">
                                        Трапеза (конец)
                                      </p>
                                    </div>
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
                                    <div className="flex items-center my-3 select-none">
                                      <div className="flex-1 h-px bg-gradient-to-l from-[#7D5E42]/50 to-transparent" />
                                      <button
                                        onClick={() =>
                                          handleSongClick(`reserve`)
                                        }
                                        className="cursor-pointer px-3 py-1 text-xs input-header uppercase tracking-wider font-bold text-[#7D5E42] bg-white/20 rounded-md"
                                      >
                                        Резерв
                                      </button>
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
                                          onClick={() =>
                                            handleSongClick(
                                              `${song._id}_${index}_reserved`,
                                              reserveSongPages?.[index],
                                            )
                                          }
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
                      {session?.user?.role === "регент" && (
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
                      )}
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
                                    <div className="flex items-center my-3 select-none">
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
                                          {(() => {
                                            const musicSelected =
                                              programSelected.includes(
                                                "Музыка",
                                              ) && song.author;
                                            const lyricsSelected =
                                              programSelected.includes(
                                                "Слова",
                                              ) && song.authorLyrics;
                                            const arrangeSelected =
                                              programSelected.includes(
                                                "Аранжировка",
                                              ) && song.authorArrange;

                                            let parts: string[] = [];

                                            if (
                                              musicSelected &&
                                              lyricsSelected &&
                                              song.author === song.authorLyrics
                                            ) {
                                              parts.push(
                                                `сл. и муз. ${song.author}`,
                                              );
                                            } else {
                                              if (musicSelected)
                                                parts.push(
                                                  `муз. ${song.author}`,
                                                );
                                              if (lyricsSelected)
                                                parts.push(
                                                  `сл. ${song.authorLyrics}`,
                                                );
                                            }

                                            if (arrangeSelected) {
                                              parts.push(
                                                `аранж. ${song.authorArrange}`,
                                              );
                                            }

                                            return parts.join(", ");
                                          })()}
                                        </span>
                                      </div>
                                    ))}

                                  {stackSongs.filter((song) => song.isReserve)
                                    .length > 0 && (
                                    <>
                                      <div className="flex items-center my-3 select-none">
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
                                              {(() => {
                                                const musicSelected =
                                                  programSelected.includes(
                                                    "Музыка",
                                                  ) && song.author;
                                                const lyricsSelected =
                                                  programSelected.includes(
                                                    "Слова",
                                                  ) && song.authorLyrics;
                                                const arrangeSelected =
                                                  programSelected.includes(
                                                    "Аранжировка",
                                                  ) && song.authorArrange;

                                                let parts: string[] = [];

                                                if (
                                                  musicSelected &&
                                                  lyricsSelected &&
                                                  song.author ===
                                                    song.authorLyrics
                                                ) {
                                                  parts.push(
                                                    `сл. и муз. ${song.author}`,
                                                  );
                                                } else {
                                                  if (musicSelected)
                                                    parts.push(
                                                      `муз. ${song.author}`,
                                                    );
                                                  if (lyricsSelected)
                                                    parts.push(
                                                      `сл. ${song.authorLyrics}`,
                                                    );
                                                }

                                                if (arrangeSelected) {
                                                  parts.push(
                                                    `аранж. ${song.authorArrange}`,
                                                  );
                                                }

                                                return parts.join(", ");
                                              })()}
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
