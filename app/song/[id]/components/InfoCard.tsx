"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";

import { SongContextProvider, useSongContext } from "../SongContextProvider";

import { InfoCardInput } from "./InfoCardInput";

import MyDropzone from "@/app/home/dropzone";
import ModalFilePreviewer from "@/app/home/modalFilePreviewer";
import { getCategoryDisplay } from "@/lib/utils";
import { Song } from "@/lib/types";
import { removeSong } from "@/actions/actions";

export const InfoCard = () => {
  const { data: session } = useSession();
  const [isEdit, setIsEdit] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const context = useSongContext();
  const song = context.songResponse;

  const [name, setName] = useState(song.doc.name);
  const [author, setAuthor] = useState(song.doc.author);
  const [authorLyrics, setAuthorLyrics] = useState(song.doc.authorLyrics);
  const [authorArrange, setAuthorArrange] = useState(song.doc.authorArrange);
  const [category, setCategory] = useState(song.doc.category);

  const onLoad = async () => {
    setSelectedFile(
      `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/uploads/${song.doc.file.filename}`,
    ); //song.doc.file
  };

  useEffect(() => {
    onLoad();
  }, []);

  const handleEdit = () => setIsEdit(!isEdit);
  const handlePreview = () => {
    setIsPreviewModalOpen(true);
  };

  const handleSave = async () => {
    const data: Partial<Song> = {
      docType: "song",
      name,
      author,
      authorLyrics,
      authorArrange,
      category,
    };

    if (selectedFile && typeof selectedFile !== "string") {
      data.file = selectedFile;
    }

    setIsEdit(false);
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };
  const handleClosePreview = () => setIsPreviewModalOpen(false);

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
    setSelectedFile(null);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      // Здесь добавьте запрос на удаление песни
      const response = await removeSong(song.doc._id);

      if (response) {
        router.push(`/playlist/${song.doc.category}`);
        router.refresh();
      } else {
        setIsDeleting(false);
      }
    } catch {
      setIsDeleting(false);
    }
  };

  const fields = [
    { label: "Название", value: song.doc.name, required: true },
    { label: "Автор музыки", value: song.doc.author },
    { label: "Автор слов", value: song.doc.authorLyrics },
    { label: "Автор аранжировки", value: song.doc.authorArrange },
    {
      label: "Категория",
      value: getCategoryDisplay(song.doc.category, "full"),
      required: true,
    },
  ];

  return (
    <SongContextProvider songResponse={song}>
      <Card className="mt-8 border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <CardHeader className="flex justify-between items-center px-8 py-6 bg-white border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 card-header">
              Детали партитуры
            </h2>
            <p className="text-gray-500 text-sm mt-1 input-header">
              Основная информация
            </p>
          </div>
          {isEdit && (
            <Button
              className="button-edit-font px-5 py-2.5 rounded-lg bg-red-50 text-red-400 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all"
              onPress={handleDeleteClick}
            >
              <svg
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Удалить
            </Button>
          )}
          {session?.user?.role === "регент" && (
            <Button
              className={`button-edit-font px-5 py-2.5 rounded-lg  transition-all ${
                isEdit
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border"
                  : "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white hover:shadow-lg"
              }`}
              endContent={isEdit ? null : null}
              onPress={handleEdit}
            >
              {isEdit ? "✕ Отменить редактирование" : "Редактировать"}
            </Button>
          )}
        </CardHeader>

        <CardBody className="p-0">
          <div className="divide-y divide-gray-100 card-header">
            {fields.map((field, index) => {
              const getPlaceholder = (label: string) => {
                const placeholders: Record<string, string> = {
                  Название: "Введите название произведения",
                  "Автор музыки": "Введите автора музыки",
                  "Автор слов": "Введите автора слов",
                  "Автор аранжировки": "Введите автора аранжировки",
                  Категория: "Выберите категорию",
                };

                return placeholders[label] || `Введите ${label.toLowerCase()}`;
              };

              return (
                <div
                  key={index}
                  className="px-8 py-6 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="w-full md:w-1/3">
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="text-red-500 ml-1 input-header">
                          *
                        </span>
                      )}
                    </div>
                    <div className="w-full md:w-2/3">
                      {isEdit ? (
                        <InfoCardInput
                          category={category}
                          field={field}
                          placeholder={getPlaceholder(field.label)}
                          onChange={(value) => {
                            switch (field.label) {
                              case "Название":
                                setName(value);
                                break;
                              case "Автор музыки":
                                setAuthor(value);
                                break;
                              case "Автор слов":
                                setAuthorLyrics(value);
                                break;
                              case "Автор аранжировки":
                                setAuthorArrange(value);
                                break;
                              case "Категория":
                                setCategory(value);
                                break;
                              default:
                                break;
                            }
                          }}
                        />
                      ) : (
                        <p className="text-gray-800 text-lg font-medium card-header">
                          {field.value || (
                            <span className="text-gray-400 card-header">—</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isEdit && (
            <>
              <div className="px-8 py-8 border-t border-gray-200 bg-gray-50/30">
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 card-header">
                    Обновить файл партитуры
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <p className="text-sm text-orange-700 input-header">
                        ⚠️ Текущий файл будет заменен
                      </p>
                    </div>
                    <MyDropzone
                      currentFile={{
                        name:
                          selectedFile && typeof selectedFile === "string"
                            ? song.doc.name
                            : selectedFile?.name || "",
                        size:
                          selectedFile && typeof selectedFile === "string"
                            ? song.doc.file?.size
                            : selectedFile?.size || 0,
                        id:
                          selectedFile && typeof selectedFile === "string"
                            ? song.doc._id
                            : null,
                      }}
                      onFileSelect={handleFileSelect}
                      onPreview={handlePreview}
                    />
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-gray-50 border-t">
                <div className="flex items-center justify-center gap-3">
                  <Button
                    className="px-5 py-2.5 rounded-lg border button-safe-font bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white-400  hover:opacity-90 transition-all"
                    onPress={handleSave}
                  >
                    Сохранить
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <ModalFilePreviewer
        isOpen={isPreviewModalOpen}
        selectedFile={selectedFile}
        onClose={handleClosePreview}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        placement="center"
        onOpenChange={setIsDeleteModalOpen}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col items-center text-center gap-2">
                <h3 className="text-2xl font-bold text-gray-900">
                  Удалить партитуру
                </h3>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Вы уверены, что хотите удалить партитуру
                    <br />
                    <span className="font-semibold text-gray-900 ml-1">
                      &quot;{song.doc.name}&quot;
                    </span>
                    ?
                  </p>
                  <div className="p-5 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200 shadow-sm">
                    <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                      <span className="text-red-500 text-base">⚠️</span>
                      Это действие невозможно отменить
                    </p>
                    <p className="text-sm text-red-700 mt-2">
                      Будет удалена вся информация, включая файл партитуры
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  className="px-6 py-3 font-medium"
                  disabled={isDeleting}
                  variant="light"
                  onPress={onClose}
                >
                  Отмена
                </Button>
                <Button
                  className="px-6 py-3 bg-gradient-to-r from-red-400 to-red-500 text-white font-medium hover:shadow-lg transition-all"
                  isLoading={isDeleting}
                  onPress={handleConfirmDelete}
                >
                  {isDeleting ? "Удаление..." : "Да, удалить"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </SongContextProvider>
  );
};
