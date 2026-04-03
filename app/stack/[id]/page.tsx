"use client";
import React, { useEffect, useState } from "react";

import { PdfTitlePage } from "./components/PdfTitlePage";
import { useStackContext } from "./components/StackContextProvider";
import { Divider } from "@heroui/divider";
import { ScrollToTop } from "./components/ScrollToTopButton";
import ModalFilePreviewer from "../../home/modalFilePreviewer";
import { getPluralForm } from "./components/GetPluralForm";
import { EyePreviewButton } from "./components/EyePreviewButton";
import { RemoveSongButton } from "./components/RemoveSongButton";
import { TrashBinIcon } from "./components/icons/TrashBinIcon";
import { Sidebar2 } from "./components/Sidebar2";
import { Monogram } from "@/components/monogram";
import { updateStack } from "@/actions/actions";
import { enqueue } from "@/lib/offline-queue";
import { recacheStack } from "@/lib/recache";
import { socket } from "@/lib/socket";
import { holidays } from "./components/Sidebar2";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { SaveIcon } from "./components/icons/SaveIcon";
import { PublishIcon } from "./components/icons/PublishIcon";
import { mealFilesMap } from "./constants";
import { StackName } from "./components/StackName";
import { ActionButton } from "./components/ActionButton";
import { DeleteStackModal } from "./components/DeleteStackModal";
import { StackCover } from "./components/StackCover";
import { StackCoverColorSelector } from "./components/StackCoverColorSelector";
import { CloseButton } from "@/app/stackView/[id]/components/CloseButton";
import EmptyStackIcon from "./components/icons/EmptyStackIcon";
import SidebarIcon from "./components/icons/SidebarIcon";

export default function StackPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const {
    stackResponse,
    stackSongs,
    removeSong,
    setStackSongs,
    mealType,
    setMealType,
    programSelected,
    setProgramSelected,
    stackName,
    stackCover,
    setIsDeleteModalOpen,
  } = useStackContext();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showButton, setShowButton] = useState(true);

  // Автопрокрутка к песне по ее instanceId с учетом фиксированного header
  const scrollToSong = (songId: string) => {
    const el = document.getElementById(songId);
    if (el) {
      // Высота фиксированного header, который может перекрывать контент
      const headerOffset = 120;
      const elementPosition =
        el.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    setStackSongs(stackResponse.doc?.songs || []);
    setProgramSelected(stackResponse.doc?.programSelected || []);
    setMealType(stackResponse.doc?.mealType || null);
  }, [stackResponse]);

  const handleClosePreview = () => setIsPreviewModalOpen(false);
  const handlePreview = (song) => {
    setSelectedFile(
      `/uploads/${song.file.filename}`,
    );
    setIsPreviewModalOpen(true);
  };

  const handleDeleteStack = () => {
    setIsDeleteModalOpen(true);
  };

  // Use a simplified helper for stack name
  const stackNameToSave = stackName?.trim() || "Стопка";

  // ИИ ниже
  const save = async () => {
    const finalName = stackName?.trim() ? stackName : "Стопка";

    if (!navigator.onLine) {
      enqueue({
        type: "stack.update",
        id: params.id,
        songs: stackSongs,
        isPublished: false,
        mealType: mealType ?? null,
        programSelected: programSelected as string[],
        name: finalName,
        cover: stackCover || "",
      });
    } else {
      await updateStack({
        stack: stackSongs,
        mealType,
        programSelected,
        isPublished: false,
        currentUrl: window.location.pathname,
        id: params.id,
        cover: stackCover,
        name: finalName,
      });
      await recacheStack(params.id);
    }

    router.push(`/`);
  };

  const publicStack = async () => {
    if (!navigator.onLine) {
      enqueue({
        type: "stack.update",
        id: params.id,
        songs: stackSongs,
        isPublished: true,
        mealType: mealType ?? null,
        programSelected: programSelected as string[],
        name: stackNameToSave,
        cover: stackCover || "",
      });
    } else {
      await updateStack({
        stack: stackSongs,
        mealType,
        programSelected,
        isPublished: true,
        currentUrl: window.location.pathname,
        id: params.id,
        cover: stackCover,
        name: stackNameToSave,
      });
      await recacheStack(params.id);
      socket.emit("stack-visibility-changed", {
        stackId: params.id,
        isPublished: true,
        stackData: {
          _id: params.id,
          name: stackNameToSave,
          songs: stackSongs,
          mealType,
          programSelected,
          isPublished: true,
          cover: stackCover || "",
          docType: "stack",
        },
      });
    }

    router.push(`/`);
  };

  const mainSongs = stackSongs.filter((s) => !s.isReserve);
  const reserveSongs = stackSongs.filter((s) => s.isReserve);

  return (
    <>
      <ScrollToTop />
      <Sidebar2 onPreview={handlePreview} />
      <div
        className={`fixed right-3 z-20 transform-gpu transition-all duration-200
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <CloseButton />
      </div>
      {stackSongs && stackSongs.length > 0 && (
        <>
          <StackCover />
          <StackName />

          <div className="mt-2 mb-4 flex justify-center">
            <div className="flex gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#FFFAF5]/70 border border-[#E6D3C2]">
              <ActionButton variant="green" onClick={save}>
                <SaveIcon />
              </ActionButton>

              <ActionButton variant="brown" onClick={publicStack}>
                <PublishIcon />
              </ActionButton>

              <StackCoverColorSelector />

              <ActionButton variant="red" onClick={handleDeleteStack}>
                <TrashBinIcon />
              </ActionButton>
            </div>
          </div>
        </>
      )}

      {stackSongs && stackSongs.length > 0 ? (
        <>
          <p
            id={`program`}
            className="flex flex-col text-default-500 text-center justify-center font-header gap-2 text-sm sm:text-base md:text-lg"
          >
            Программа
          </p>
          <div className="justify-center flex gap-2 mb-6">
            <p className="text-bold text-sm input-header justify-center text-default-500">
              {mainSongs.length} {getPluralForm(mainSongs.length)}
            </p>
          </div>

          {mainSongs.map((song, index) => (
            <React.Fragment key={song.instanceId || index}>
              {index === 0 &&
                programSelected.includes("Трапеза") &&
                mealType &&
                mealFilesMap[mealType]?.start && (
                  <div
                    id={`meal_start`}
                    className="rounded-xl border border-default-200 bg-default-50/50 px-3 py-1.5 sm:px-4 sm:py-3 mb-1 sm:mb-4 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex gap-2 items-center justify-between">
                      <div className="flex gap-2 items-center">
                        <p className="text-bold text-sm  text-left input-header">
                          {mealType === "daily"
                            ? "Молитва перед вкушением пищи"
                            : `Тропарь ${
                                holidays.find((h) => h.key === mealType)
                                  ?.fullName ||
                                holidays.find((h) => h.key === mealType)
                                  ?.label ||
                                ""
                              }`}
                        </p>
                      </div>
                    </div>
                    <div className="relative my-2">
                      <Divider className="opacity-60" />
                    </div>
                    <div className="mt-1 mb-1 sm:mb-6 sm:mt-2">
                      <PdfTitlePage
                        fileUrl={`/${mealFilesMap[mealType].start}`}
                      />
                    </div>
                  </div>
                )}
              <div
                id={`${song._id}_${index}`}
                className="rounded-xl border border-default-200 bg-default-50/50 px-3 py-1.5 sm:px-4 sm:py-3 mb-1 sm:mb-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 w-full">
                    <div className="flex flex-row flex-wrap sm:flex-nowrap sm:items-center gap-1 sm:gap-2 justify-center sm:justify-start w-full">
                      <p className="text-bold text-sm capitalize input-header">
                        {index + 1}. {song.name}
                        {song.author && (
                          <>
                            <span className="text-black"> —</span>{" "}
                            <span className="text-default-500">
                              {song.author}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex justify-center sm:justify-end gap-2 mt-2 sm:mt-0">
                      <EyePreviewButton onClick={() => handlePreview(song)} />
                      <RemoveSongButton
                        onClick={() => removeSong(song.instanceId)}
                      />
                    </div>
                  </div>
                </div>
                <div className="relative my-2">
                  <Divider className="opacity-60" />
                </div>
                <div className="mt-1 mb-1 sm:mb-6 sm:mt-2">
                  <PdfTitlePage
                    fileUrl={`/uploads/${song.file.filename}`}
                  />
                </div>
              </div>
              {/* Вставляем PDF конца трапезы */}
              {index === mainSongs.length - 1 &&
                programSelected.includes("Трапеза") &&
                mealType &&
                mealFilesMap[mealType]?.end && (
                  <div
                    id={`meal_end`}
                    className="rounded-xl border border-default-200 bg-default-50/50 px-3 py-1.5 sm:px-4 sm:py-3 mb-1 sm:mb-4 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex gap-2 items-center justify-between">
                      <div className="flex gap-2 items-center">
                        <p className="text-bold text-sm text-left input-header">
                          {mealType === "daily"
                            ? "Молитва после вкушения пищи"
                            : `Кондак ${
                                holidays.find((h) => h.key === mealType)
                                  ?.fullName ||
                                holidays.find((h) => h.key === mealType)
                                  ?.label ||
                                ""
                              }`}
                        </p>
                      </div>
                    </div>
                    <div className="relative my-2">
                      <Divider className="opacity-60" />
                    </div>
                    <div className="mt-1 mb-1 sm:mb-6 sm:mt-2">
                      <PdfTitlePage
                        fileUrl={`/${mealFilesMap[mealType].end}`}
                      />
                    </div>
                  </div>
                )}
            </React.Fragment>
          ))}

          <div className="flex justify-center mt-4 mb-14">
            <Monogram className="h-9" />
          </div>

          {reserveSongs.length > 0 && (
            <div className="mt-16 flex flex-col">
              <p
                id={`reserve`}
                className="flex flex-col text-default-500 text-center justify-center font-header gap-2 text-sm sm:text-base md:text-lg"
              >
                Резерв
              </p>
              <div className="justify-center flex gap-2 mb-6">
                <p className="text-bold text-sm input-header justify-center text-default-500">
                  {reserveSongs.length} {getPluralForm(reserveSongs.length)}
                </p>
              </div>
              {reserveSongs.map((song, index) => (
                <div
                  id={`${song._id}_${index}_reserved`}
                  key={song.instanceId || index}
                  className="rounded-xl border border-default-200 bg-default-50/50 px-3 py-1.5 sm:px-4 sm:py-3 mb-1 sm:mb-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 w-full">
                      <div className="flex flex-row flex-wrap sm:flex-nowrap sm:items-center gap-1 sm:gap-2 justify-center sm:justify-start w-full">
                        <p className="text-bold text-sm capitalize input-header">
                          {index + 1}. {song.name}
                          {song.author && (
                            <>
                              <span className="text-black"> —</span>{" "}
                              <span className="text-default-500">
                                {song.author}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex justify-center sm:justify-end gap-2 mt-2 sm:mt-0">
                        <EyePreviewButton onClick={() => handlePreview(song)} />
                        <RemoveSongButton
                          onClick={() => removeSong(song.instanceId)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="relative my-2">
                    <Divider className="opacity-60" />
                  </div>
                  <div className="mt-1 mb-1 sm:mb-6 sm:mt-2">
                    <PdfTitlePage
                      fileUrl={`/uploads/${song.file.filename}`}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-center mt-4 mb-4">
                <Monogram className="h-9" />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-gray-500">
          <EmptyStackIcon className="w-32 h-32 text-gray-400" />

          <p className="text-center text-gray-400 text-xl input-header font-medium leading-snug max-w-md">
            В этой стопке пока нет песен — добавьте песню через боковое меню{" "}
            <SidebarIcon className="inline" />
          </p>
        </div>
      )}

      <ModalFilePreviewer
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        selectedFile={selectedFile}
      />
      <DeleteStackModal />
    </>
  );
}
