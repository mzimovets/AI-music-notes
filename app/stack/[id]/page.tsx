"use client";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";

import { Button } from "@heroui/button";
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
import { removeStack, updateStack } from "@/actions/actions";
import { holidays } from "./components/Sidebar2";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { SaveIcon } from "./components/icons/SaveIcon";
import { PublishIcon } from "./components/icons/PublishIcon";

const mealFilesMap: Record<string, { start: string; end: string }> = {
  daily: {
    start: "meals-pdf/daily-per.pdf",
    end: "meals-pdf/daily-pos.pdf",
  },
  rozhdestvo: {
    start: "meals-pdf/rozhdestvo-trop.pdf",
    end: "meals-pdf/rozhdestvo-kond.pdf",
  },
  kreshchenie: {
    start: "meals-pdf/kreshchenie-trop.pdf",
    end: "meals-pdf/kreshchenie-kond.pdf",
  },
  sretenie: {
    start: "meals-pdf/sretenie-trop.pdf",
    end: "meals-pdf/sretenie-kond.pdf",
  },
  blagoveshchenie: {
    start: "meals-pdf/blagoveshchenie-trop.pdf",
    end: "meals-pdf/blagoveshchenie-kond.pdf",
  },
  vhod: {
    start: "meals-pdf/vhod-trop.pdf",
    end: "meals-pdf/vhod-kond.pdf",
  },
  pascha: {
    start: "meals-pdf/pascha-trop.pdf",
    end: "meals-pdf/pascha-kond.pdf",
  },
  voznesenie: {
    start: "meals-pdf/voznesenie-trop.pdf",
    end: "meals-pdf/voznesenie-kond.pdf",
  },
  troica: {
    start: "meals-pdf/troica-trop.pdf",
    end: "meals-pdf/troica-kond.pdf",
  },
  preobrazhenie: {
    start: "meals-pdf/preobrazhenie-trop.pdf",
    end: "meals-pdf/preobrazhenie-kond.pdf",
  },
  uspenie: {
    start: "meals-pdf/uspenie-trop.pdf",
    end: "meals-pdf/uspenie-kond.pdf",
  },
  rozhdestvoBogorodicy: {
    start: "meals-pdf/rozhdestvoBogorodicy-trop.pdf",
    end: "meals-pdf/rozhdestvoBogorodicy-kond.pdf",
  },
  vozdvizhenie: {
    start: "meals-pdf/vozdvizhenie-trop.pdf",
    end: "meals-pdf/vozdvizhenie-kond.pdf",
  },
  vvedenie: {
    start: "meals-pdf/vvedenie-trop.pdf",
    end: "meals-pdf/vvedenie-kond.pdf",
  },
};

type ActionButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  variant: "green" | "brown" | "red";
};

const ActionButton = ({ children, onClick, variant }: ActionButtonProps) => {
  const baseClass =
    "button-edit-font px-3 py-1.5 text-sm rounded-full border transition-all flex gap-1.5 items-center";

  const variants = {
    green:
      "bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:border-green-300",
    brown:
      "bg-[#FFFAF5] text-[#7D5E42] border-[#E6D3C2] hover:bg-[#F3E8DE] hover:border-[#BD9673]",
    red: "bg-red-50 text-red-400 border-red-200 hover:bg-red-100 hover:border-red-300",
  };

  return (
    <button onClick={onClick} className={`${baseClass} ${variants[variant]}`}>
      {children}
    </button>
  );
};

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
  } = useStackContext();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await removeStack(params.id);
      if (response) {
        router.push(`/`);
        router.refresh();
      } else {
        setIsDeleting(false);
        console.error("Ошибка при удалении стопки");
      }
    } catch (error) {
      console.error("Ошибка при удалении стопки:", error);
      setIsDeleting(false);
    }
  };

  const save = async () => {
    const resp = await updateStack({
      stack: stackSongs,
      mealType,
      programSelected,
      isPublished: false,
      currentUrl: window.location.pathname,
      id: params.id,
      name: stackResponse.doc?.name,
    });
    console.log("resp", resp);
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
      name: stackResponse.doc?.name,
    });
    console.log("resp", resp);
    router.push(`/`);
  };

  const mainSongs = stackSongs.filter((s) => !s.isReserve);
  const reserveSongs = stackSongs.filter((s) => s.isReserve);

  console.log("mainsongs: ", mainSongs);
  console.log("mealFilesMap: ", mealFilesMap[mealType]);

  return (
    <>
      <ScrollToTop />
      <Sidebar2 onPreview={handlePreview} />

      <p className="flex flex-col text-center justify-center font-header gap-2 mb-2 text-lg sm:text-xl md:text-2xl">
        {stackResponse.doc?.name}
      </p>

      <div className="mt-2 mb-4 flex justify-center">
        <div className="flex gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#FFFAF5]/70 border border-[#E6D3C2]">
          <ActionButton variant="green" onClick={save}>
            <SaveIcon />
          </ActionButton>

          <ActionButton variant="brown" onClick={publicStack}>
            <PublishIcon />
          </ActionButton>

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
      <Modal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-gray-900">
                  Удалить стопку
                </h3>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Вы уверены, что хотите удалить стопку
                    <br />
                    <span className="font-semibold text-gray-900 ml-1">
                      "{stackResponse.doc?.name}"
                    </span>
                    ?
                  </p>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 font-medium">
                      ⚠️ Это действие невозможно отменить
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} disabled={isDeleting}>
                  Отмена
                </Button>
                <Button
                  onPress={handleConfirmDelete}
                  className="bg-gradient-to-r from-red-400 to-red-500 text-white"
                  isLoading={isDeleting}
                >
                  {isDeleting ? "Удаление..." : "Да, удалить"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
