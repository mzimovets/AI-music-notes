"use client";
import MyDropzone from "@/app/home/dropzone";
import ModalFilePreviewer from "@/app/home/modalFilePreviewer";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { useState } from "react";
import { SongContextProvider, useSongContext } from "../SongContextProvider";
import { getCategoryDisplay } from "@/lib/utils";
import { InfoCardInput } from "./InfoCardInput";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";

export const InfoCard = () => {
  const [isEdit, setIsEdit] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const context = useSongContext();
  const song = context.songResponse;

  const handleEdit = () => setIsEdit(!isEdit);
  const handlePreview = () => {
    if (selectedFile) {
      setIsPreviewModalOpen(true);
    }
  };
  const handleFileSelect = (file: File | null) => setSelectedFile(file);
  const handleClosePreview = () => setIsPreviewModalOpen(false);

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      // Здесь добавьте запрос на удаление песни
      const response = await fetch(`/api/songs/${song.doc._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/home");
        router.refresh();
      } else {
        console.error("Ошибка при удалении песни");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("Ошибка при удалении песни:", error);
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

  const [name, setName] = useState(song.doc.name);
  const [author, setAuthor] = useState(song.doc.author);
  const [authorLyrics, setAuthorLyrics] = useState(song.doc.authorLyrics);
  const [authorArrange, setAuthorArrange] = useState(song.doc.authorArrange);
  const [category, setCategory] = useState(song.doc.category);

  return (
    <SongContextProvider songResponse={song}>
      <Card className="mt-8 border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <CardHeader className="flex justify-between items-center px-8 py-6 bg-white border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 card-header">
              Детали партитуры
            </h2>
            <p className="text-gray-500 text-sm mt-1">Основная информация</p>
          </div>
          {isEdit && (
            <Button
              onPress={handleDeleteClick}
              className="px-5 py-2.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all"
            >
              🗑️ Удалить
            </Button>
          )}
          <Button
            onPress={handleEdit}
            endContent={isEdit ? null : null}
            className={`button-edit-font px-5 py-2.5 rounded-lg  transition-all ${
              isEdit
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border"
                : "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white hover:shadow-lg"
            }`}
          >
            {isEdit ? "✕ Закрыть редактирование" : "✏️ Редактировать"}
          </Button>
        </CardHeader>

        <CardBody className="p-0">
          <div className="divide-y divide-gray-100 ">
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
                          placeholder={getPlaceholder(field.label)}
                          field={field}
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
                      <p className="text-sm text-orange-700">
                        ⚠️ Текущий файл будет заменен
                      </p>
                    </div>
                    <MyDropzone
                      onFileSelect={handleFileSelect}
                      onPreview={handlePreview}
                      currentFile={{
                        name: song.doc.file.filename,
                        size: song.doc.file.size,
                        id: song.doc.fileId,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-gray-50 border-t">
                <div className="flex justify-end gap-3">
                  <Button
                    onPress={() => setIsEdit(false)}
                    variant="bordered"
                    className="px-6 py-3 font-medium"
                  >
                    Отменить
                  </Button>
                  <Button className="px-6 py-3 bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white font-medium">
                    Сохранить все изменения
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <ModalFilePreviewer
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        selectedFile={selectedFile}
      />

      {/* РЕФАКТОРИНГ */}

      <Modal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-xl">⚠️</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Удалить песню
                  </h3>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Вы уверены, что хотите удалить песню
                    <span className="font-semibold text-gray-900 ml-1">
                      "{song.doc.name}"
                    </span>
                    ?
                  </p>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 font-medium">
                      ⚠️ Это действие невозможно отменить. Будет удалена вся
                      информация о песне, включая файл партитуры.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="text-red-500 font-medium">ID:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                      {song.doc._id}
                    </code>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={onClose}
                  className="px-6 py-3 font-medium"
                  disabled={isDeleting}
                >
                  Отмена
                </Button>
                <Button
                  onPress={handleConfirmDelete}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:shadow-lg transition-all"
                  isLoading={isDeleting}
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
