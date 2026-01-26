"use client";
import React from "react";
import { DocViewer } from "../song/[id]/components/DocViewer";
import { Button } from "@heroui/button";
import { PdfTitlePage } from "./components/PdfTitlePage";
import {
  StackContextProvider,
  useStackContext,
} from "./components/StackContextProvider";
import { Divider } from "@heroui/divider";
import { ScrollToTop } from "./components/ScrollToTopButton";

export default function StackPage() {
  const { stackSongs, setStackSongs } = useStackContext();
  console.log("stackSongs: ", stackSongs);

  return (
    <div>
      <ScrollToTop />
      <p className="flex flex-col text-center justify-center font-header gap-4">
        Название стопки
      </p>
      {stackSongs.map((song) => {
        console.log("fileUrl: ", `http://localhost:4000/uploads/`, song);
        return (
          <div key={song._id}>
            <div>
              <div className="flex gap-2 items-center mt-4">
                <p className="text-bold text-sm capitalize text-left input-header">
                  {song.name}
                </p>
                {song.author && <span>-</span>}
                <p className="text-bold text-sm capitalize input-header justify-center text-default-500 grow-20 items-center">
                  {song.author}
                </p>
                <div className="">
                  <button className="text-lg text-red-400 cursor-pointer active:opacity-50">
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
            </div>
            <PdfTitlePage
              key={song._id}
              fileUrl={`http://localhost:4000/uploads/${song.file.filename}`}
            />
          </div>
        );
      })}
      {stackSongs && stackSongs.length > 0 ? (
        <div className="flex flex-col gap-4 mt-6">
          <div className="justify-center flex gap-2">
            <p className="text-bold text-sm input-header justify-center text-default-500">
              {stackSongs.length} партитур
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
              // onPress={handleDeleteClick}
              className="button-edit-font px-5 py-2.5 rounded-lg bg-red-50 text-red-400 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
              Удалить
            </Button>
          </div>
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
}
