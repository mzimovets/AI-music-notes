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
import { holidays } from "./components/Sidebar2";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { SaveIcon } from "./components/icons/SaveIcon";
import { PublishIcon } from "./components/icons/PublishIcon";
import { mealFilesMap } from "./constants";
import { StackName } from "./components/StackName";
import { ActionButton } from "./components/ActionButton";
import { DeleteStackModal } from "./components/DeleteStackModal";
import { ColorIcon } from "./components/icons/ColorIcon";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Button } from "@heroui/button";

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
    setIsDeleteModalOpen,
  } = useStackContext();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  useEffect(() => {
    setStackSongs(stackResponse.doc?.songs || []);
    setProgramSelected(stackResponse.doc?.programSelected || []);
    setMealType(stackResponse.doc?.mealType || null);
  }, [stackResponse]);

  const handleClosePreview = () => setIsPreviewModalOpen(false);
  const handlePreview = (song) => {
    setSelectedFile(`http://localhost:4000/uploads/${song.file.filename}`);
    setIsPreviewModalOpen(true);
  };

  const handleDeleteStack = () => {
    setIsDeleteModalOpen(true);
  };

  const save = async () => {
    const resp = await updateStack({
      stack: stackSongs,
      mealType,
      programSelected,
      isPublished: false,
      currentUrl: window.location.pathname,
      id: params.id,
      name: stackName,
    });

    router.push(`/`);
  };

  const publicStack = async () => {
    const resp = await updateStack({
      stack: stackSongs,
      mealType,
      programSelected,
      isPublished: true,
      currentUrl: window.location.pathname,
      id: params.id,
      name: stackName,
    });

    router.push(`/`);
  };

  const mainSongs = stackSongs.filter((s) => !s.isReserve);
  const reserveSongs = stackSongs.filter((s) => s.isReserve);

  return (
    <>
      <ScrollToTop />
      <Sidebar2 onPreview={handlePreview} />

      <StackName />

      <div className="mt-2 mb-4 flex justify-center">
        <div className="flex gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#FFFAF5]/70 border border-[#E6D3C2]">
          <ActionButton variant="green" onClick={save}>
            <SaveIcon />
          </ActionButton>

          <ActionButton variant="brown" onClick={publicStack}>
            <PublishIcon />
          </ActionButton>

          <Popover placement="bottom" showArrow={true}>
            <PopoverTrigger>
              <ActionButton variant="yellow" onClick={() => {}}>
                <ColorIcon />
              </ActionButton>
            </PopoverTrigger>
            <PopoverContent>
              <div className="px-1 py-2 flex flex-col items-center">
                <div className="text-small font-bold text-center">
                  Выберите цвет обложки стопки
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {[
                    "6b352d",
                    "88799a",
                    "485110",
                    "2b4659",
                    "3c3d38",
                    "cc671f",
                    "744624",
                    "9bad4a",
                    "d1a600",
                    "cacbbd",
                    "6b8caf",
                    "554454",
                  ].map((color) => (
                    <Button
                      key={color}
                      isIconOnly
                      radius="full"
                      disableRipple
                      onPress={() => setSelectedColor(color)}
                      className="!w-8 !h-8 min-w-0 p-0 flex items-center justify-center hover:scale-110 transition-transform"
                      style={{ backgroundColor: `#${color}` }}
                    >
                      {selectedColor === color && (
                        <span className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <ActionButton variant="red" onClick={handleDeleteStack}>
            <TrashBinIcon />
          </ActionButton>
        </div>
      </div>

      {stackSongs && stackSongs.length > 0 ? (
        <>
          <p className="flex flex-col text-default-500 text-center justify-center font-header gap-2 text-sm sm:text-base md:text-lg">
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
                  <div className="rounded-xl border border-default-200 bg-default-50/50 px-3 py-1.5 sm:px-4 sm:py-3 mb-1 sm:mb-4 transition-shadow hover:shadow-sm">
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
                    <div className="mt-1 mb-1  sm:mb-6 sm:mt-2">
                      <PdfTitlePage
                        fileUrl={`/${mealFilesMap[mealType].start}`}
                      />
                    </div>
                  </div>
                )}
              <div className="rounded-xl border border-default-200 bg-default-50/50 px-3 py-1.5 sm:px-4 sm:py-3 mb-1 sm:mb-4 transition-shadow hover:shadow-sm">
                <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 w-full">
                    <div className="flex flex-row flex-wrap sm:flex-nowrap sm:items-center gap-1 sm:gap-2 justify-center sm:justify-start w-full">
                      <p className="text-bold text-sm capitalize input-header">
                        {index + 1}. {song.name}
                      </p>
                      {song.author && (
                        <p className="text-bold text-sm capitalize input-header text-default-500 sm:ml-2">
                          {song.author}
                        </p>
                      )}
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
                    fileUrl={`http://localhost:4000/uploads/${song.file.filename}`}
                  />
                </div>
              </div>
              {/* Вставляем PDF конца трапезы */}
              {index === mainSongs.length - 1 &&
                programSelected.includes("Трапеза") &&
                mealType &&
                mealFilesMap[mealType]?.end && (
                  <div className="rounded-xl border border-default-200 bg-default-50/50 px-3 py-1.5 sm:px-4 sm:py-3 mb-1 sm:mb-4 transition-shadow hover:shadow-sm">
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
              <p className="flex flex-col text-default-500 text-center justify-center font-header gap-2 text-sm sm:text-base md:text-lg">
                Резерв
              </p>
              <div className="justify-center flex gap-2 mb-6">
                <p className="text-bold text-sm input-header justify-center text-default-500">
                  {reserveSongs.length} {getPluralForm(reserveSongs.length)}
                </p>
              </div>
              {reserveSongs.map((song, index) => (
                <div
                  key={song.instanceId || index}
                  className="rounded-xl border border-default-200 bg-default-50/50 px-3 py-1.5 sm:px-4 sm:py-3 mb-1 sm:mb-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 w-full">
                      <div className="flex flex-row flex-wrap sm:flex-nowrap sm:items-center gap-1 sm:gap-2 justify-center sm:justify-start w-full">
                        <p className="text-bold text-sm capitalize input-header">
                          {index + 1}. {song.name}
                        </p>
                        {song.author && (
                          <p className="text-bold text-sm capitalize input-header text-default-500 sm:ml-2">
                            {song.author}
                          </p>
                        )}
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
                      fileUrl={`http://localhost:4000/uploads/${song.file.filename}`}
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
      ) : null}

      <ModalFilePreviewer
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        selectedFile={selectedFile}
      />
      <DeleteStackModal />
    </>
  );
}
