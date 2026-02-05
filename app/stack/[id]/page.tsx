"use client";
import React, { useEffect, useState } from "react";
const mealFilesMap: Record<string, { start: string; end: string }> = {
  daily: {
    start: "meals-pdf/per-ed.pdf",
    end: "meals-pdf/pos-ed.pdf",
  },
  rozhdestvo: {
    start: "meals-pdf/trop-christm.pdf",
    end: "meals-pdf/cond-christm.pdf",
  },
};

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
import { updateStack } from "@/actions/actions";
import { holidays } from "./components/Sidebar2";
import { useParams } from "next/navigation";

export default function StackPage() {
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
  };

  const mainSongs = stackSongs.filter((s) => !s.isReserve);
  const reserveSongs = stackSongs.filter((s) => s.isReserve);

  console.log("mainsongs: ", mainSongs);

  return (
    <div>
      <ScrollToTop />
      <Sidebar2 onPreview={handlePreview} />

      <p className="flex flex-col text-center justify-center font-header gap-4 mb-6">
        Название стопки {stackResponse.doc?.name}
      </p>

      {stackSongs && stackSongs.length > 0 ? (
        <>
          <p className="flex flex-col text-default-500 text-center justify-center font-header gap-4 mb-6">
            Программа
          </p>

          {mainSongs.map((song, index) => (
            <React.Fragment key={song.instanceId || index}>
              {index === 0 &&
                programSelected.includes("Трапеза") &&
                mealType &&
                mealFilesMap[mealType]?.start && (
                  <div className="rounded-xl border border-default-200 bg-default-50/50 px-4 py-3 mb-4 transition-shadow hover:shadow-sm">
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
                    <div className="mt-2 mb-6">
                      <PdfTitlePage fileUrl={mealFilesMap[mealType].start} />
                    </div>
                  </div>
                )}
              <div className="rounded-xl border border-default-200 bg-default-50/50 px-4 py-3 mb-4 transition-shadow hover:shadow-sm">
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <p className="text-bold text-sm capitalize text-left input-header">
                      {index + 1}. {song.name}
                    </p>
                    {song.author && <span>{"\u2013"}</span>}
                    <p className="text-bold text-sm capitalize input-header justify-center text-default-500 grow-20 items-center">
                      {song.author}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <EyePreviewButton onClick={() => handlePreview(song)} />
                    <RemoveSongButton
                      onClick={() => removeSong(song.instanceId)}
                    />
                  </div>
                </div>
                <div className="relative my-4">
                  <Divider className="opacity-60" />
                </div>
                <div className="mt-2 mb-6">
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
                  <div className="rounded-xl border border-default-200 bg-default-50/50 px-4 py-3 mb-4 transition-shadow hover:shadow-sm">
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
                    <div className="mt-2 mb-6">
                      <PdfTitlePage fileUrl={mealFilesMap[mealType].end} />
                    </div>
                  </div>
                )}
            </React.Fragment>
          ))}

          <div className="flex justify-center mt-4 mb-14">
            <Monogram className="h-9" />
          </div>

          {reserveSongs.length > 0 && (
            <div className="mt-16 flex flex-col gap-2">
              <p className="flex text-default-500 flex-col text-center justify-center font-header gap-4 mb-6">
                Резерв
              </p>
              {reserveSongs.map((song, index) => (
                <div
                  key={song.instanceId || index}
                  className="rounded-xl border border-default-200 bg-default-50/50 px-4 py-3 mb-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex gap-2 items-center justify-between">
                    <div className="flex gap-2 items-center">
                      <p className="text-bold text-sm capitalize text-left input-header">
                        {index + 1}. {song.name}
                      </p>
                      {song.author && <span>{"\u2013"}</span>}
                      <p className="text-bold text-sm capitalize input-header justify-center text-default-500 grow-20 items-center">
                        {song.author}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <EyePreviewButton onClick={() => handlePreview(song)} />
                      <RemoveSongButton
                        onClick={() => removeSong(song.instanceId)}
                      />
                    </div>
                  </div>
                  <div className="relative my-4">
                    <Divider className="opacity-60" />
                  </div>
                  <div className="mt-2">
                    <PdfTitlePage
                      fileUrl={`http://localhost:4000/uploads/${song.file.filename}`}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-center mt-4 mb-14">
                <Monogram className="h-9" />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-4 mt-6">
            <div className="justify-center flex gap-2">
              <p className="text-bold text-sm input-header justify-center text-default-500">
                {stackSongs.length} {getPluralForm(stackSongs.length)}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                variant="flat"
                color="primary"
                className="font-medium button-bg"
                onPress={save}
              >
                Сохранить
              </Button>
              <Button
                variant="shadow"
                color="success"
                className="text-white font-medium"
                onPress={publicStack}
              >
                Опубликовать
              </Button>
              <Button
                onPress={() => setStackSongs([])}
                className="button-edit-font px-5 py-2.5 rounded-lg bg-red-50 text-red-400 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all flex gap-2 items-center"
              >
                <TrashBinIcon /> Очистить всё
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="bg-default-50 p-8 rounded-full mb-6">
            <svg
              className="w-20 h-20 text-default-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold font-header text-default-800 mb-2">
            В стопке пока пусто
          </h2>
          <p className="text-default-500 max-w-sm mb-8 input-header">
            Добавьте партитуры из библиотеки с помощью поиска в боковой панели,
            чтобы сформировать свою подборку
          </p>
          <div className="flex flex-wrap gap-4"></div>
        </div>
      )}

      <ModalFilePreviewer
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        selectedFile={selectedFile}
      />
    </div>
  );
}
