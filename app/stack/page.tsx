"use client";
import React, { useState } from "react";
import { Button } from "@heroui/button";
import { PdfTitlePage } from "./components/PdfTitlePage";
import { useStackContext } from "./components/StackContextProvider";
import { Divider } from "@heroui/divider";
import { ScrollToTop } from "./components/ScrollToTopButton";
import ModalFilePreviewer from "../home/modalFilePreviewer";
import { getPluralForm } from "./components/GetPluralForm";
import { EyePreviewButton } from "./components/EyePreviewButton";
import { RemoveSongButton } from "./components/RemoveSongButton";
import { TrashBinIcon } from "./components/icons/TrashBinIcon";
import { Sidebar2 } from "./components/Sidebar2";
import { Pattern } from "@/components/pattern";
import { Monogram } from "@/components/monogram";

export default function StackPage() {
  const { stackSongs, removeSong, setStackSongs } = useStackContext();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleClosePreview = () => setIsPreviewModalOpen(false);
  const handlePreview = (song) => {
    setSelectedFile(`http://localhost:4000/uploads/${song.file.filename}`);
    setIsPreviewModalOpen(true);
  };

  // Разделяем песни на обычные и резерв
  const mainSongs = stackSongs.filter((s) => !s.isReserve);
  const reserveSongs = stackSongs.filter((s) => s.isReserve);

  return (
    <div>
      <ScrollToTop />
      <Sidebar2 onPreview={handlePreview} />
      <p className="flex flex-col text-center justify-center font-header gap-4 mb-6">
        Название стопки
      </p>
      {stackSongs && stackSongs.length > 0 ? (
        <>
          {/* Основная программа */}
          <p className="flex flex-col text-default-500  text-center justify-center font-header gap-4 mb-6">
            Программа
          </p>
          {mainSongs.length > 0 &&
            mainSongs.map((song, index) => (
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
                <div className="mt-2 mb-6">
                  <PdfTitlePage
                    fileUrl={`http://localhost:4000/uploads/${song.file.filename}`}
                  />
                </div>
              </div>
            ))}
          <div className="flex justify-center mt-4 mb-14">
            <Monogram className="h-9" />
          </div>
          {/* Резерв */}
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
              >
                Сохранить
              </Button>
              <Button
                variant="shadow"
                color="success"
                className="text-white font-medium"
              >
                Опубликовать
              </Button>
              <Button
                onPress={() => setStackSongs([])}
                className="button-edit-font px-5 py-2.5 rounded-lg bg-red-50 text-red-400 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all flex gap-2 items-center"
              >
                <TrashBinIcon />
                Очистить всё
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
