"use client";
import React, { useState } from "react";
import { Button } from "@heroui/button";
import { PdfTitlePage } from "./components/PdfTitlePage";
import { useStackContext } from "./components/StackContextProvider";
import { Divider } from "@heroui/divider";
import { ScrollToTop } from "./components/ScrollToTopButton";
import ModalFilePreviewer from "../home/modalFilePreviewer";
import { getPluralForm } from "./components/GetPluralForm";

export default function StackPage() {
  const { stackSongs, removeSong, setStackSongs } = useStackContext();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleClosePreview = () => setIsPreviewModalOpen(false);
  const handlePreview = (song) => {
    setSelectedFile(`http://localhost:4000/uploads/${song.file.filename}`);
    setIsPreviewModalOpen(true);
  };

  return (
    <div>
      <ScrollToTop />

      <p className="flex flex-col text-center justify-center font-header gap-4">
        Название стопки
      </p>

      {stackSongs && stackSongs.length > 0 ? (
        <>
          {stackSongs.map((song, index) => (
            <div key={song.instanceId || index}>
              <div className="flex gap-2 items-center mt-4 justify-between">
                <div className="flex gap-2 items-center">
                  <p className="text-bold text-sm capitalize text-left input-header">
                    {song.name}
                  </p>
                  {song.author && <span>-</span>}
                  <p className="text-bold text-sm capitalize input-header justify-center text-default-500 grow-20 items-center">
                    {song.author}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePreview(song)}
                    className="text-lg text-blue-400 hover:text-blue-500 cursor-pointer active:opacity-50 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.27489 15.2957C2.42496 14.1915 2 13.6394 2 12C2 10.3606 2.42496 9.80853 3.27489 8.70433C4.97196 6.49956 7.81811 4 12 4C16.1819 4 19.028 6.49956 20.7251 8.70433C21.575 9.80853 22 10.3606 22 12C22 13.6394 21.575 14.1915 20.7251 15.2957C19.028 17.5004 16.1819 20 12 20C7.81811 20 4.97196 17.5004 3.27489 15.2957Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeSong(song.instanceId)}
                    className="text-lg text-red-400 cursor-pointer active:opacity-50"
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
                  </button>
                </div>
              </div>
              <Divider className="my-2" />
              <PdfTitlePage
                fileUrl={`http://localhost:4000/uploads/${song.file.filename}`}
              />
            </div>
          ))}

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
