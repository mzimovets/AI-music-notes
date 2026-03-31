"use client";
import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  useDisclosure,
  addToast,
} from "@heroui/react";

import MyDropzone from "./dropzone";
import ModalFilePreviewer from "./modalFilePreviewer";
import { addSong } from "@/actions/actions";
import { Song } from "@/lib/types";
import { Pattern } from "@/components/pattern";
import { useRouter } from "next/navigation";
import { getCategoryDisplay } from "@/lib/utils";
import { AddSongIcon } from "@/components/icons/AddSongIcon";
import { useAllSongsLibraryContextProvider } from "../providers";

export const songs = [
  { label: "Духовные канты", key: "spiritual_chants" },
  { label: "Пасха", key: "easter" },
  { label: "Колядки", key: "carols" },
  { label: "Народные", key: "folk" },
  { label: "Советские", key: "soviet" },
  { label: "Военные", key: "military" },
  { label: "Детские", key: "childrens" },
  { label: "Другое", key: "other" },
];

export default function ModalAddScore() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isPreviewOpen,
    onOpen: onOpenPreview,
    onClose: onClosePreview,
  } = useDisclosure();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [authorLyrics, setAuthorLyrics] = useState("");
  const [authorArrange, setAuthorArrange] = useState("");
  const [category, setCategory] = useState("");
  const { allSongs, setAllSongs } = useAllSongsLibraryContextProvider();

  const [validationErrors, setValidationErrors] = useState({
    name: false,
    category: false,
    file: false,
  });

  useEffect(() => {
    if (!isOpen && !isSaved) {
      setSelectedFile(null);
      setValidationErrors({ name: false, category: false, file: false });
    }
    if (!isOpen) setIsSaved(false);
  }, [isOpen, isSaved]);

  const validateForm = () => {
    const errors = {
      name: !name.trim(),
      category: !category,
      file: !selectedFile,
    };
    setValidationErrors(errors);
    return !errors.name && !errors.category && !errors.file;
  };

  const fetchAllSongs = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/songs`,
      );
      const data = await response.json();

      if (data.status === "ok" && data.docs) {
        const songs = data.docs
          .filter((song) => song.docType === "song")
          .map((song) => ({
            _id: song._id,
            name: song.doc?.name || song.name || "",
            author: song.doc?.author || song.author || "",
            authorLyrics: song.doc?.authorLyrics || song.authorLyrics || "",
            authorArrange: song.doc?.authorArrange || song.authorArrange || "",
            category: song.doc?.category || song.category || "",
            file: song.doc?.file || song.file || {},
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "ru"));

        setAllSongs(songs);
      }
    } catch (error) {
      console.error("Ошибка при загрузке песен:", error);
    }
  };

  const handleSave = async (onClose: () => void) => {
    if (!validateForm()) return;

    const data: Song = {
      name,
      author,
      file: selectedFile,
      docType: "song",
      category,
      authorArrange,
      authorLyrics,
    };
    setIsSaved(true);

    const response = await addSong(data, window.location.pathname);

    addToast({
      title: <span className="font-bold text-white">Партитура добавлена</span>,
      description: (
        <div
          onClick={() => router.push(`/song/${response.doc._id}`)}
          className="text-white"
        >
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="font-bold text-lg">{name}</span>
              <span className="text-sm opacity-90 mt-1">
                {getCategoryDisplay(category, "full")}
              </span>
            </div>
            {author && (
              <div className="flex flex-col border-l border-white/30 pl-6">
                <span className="text-sm opacity-75">Автор</span>
                <span className="font-medium mt-1">{author}</span>
              </div>
            )}
          </div>
        </div>
      ),
      timeout: 5000,
      shouldShowTimeoutProgress: true,
      classNames: {
        base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white",
      },
    });

    await fetchAllSongs();
    onClose();
  };

  return (
    <>
      {/* Desktop button */}
      <Button
        className="hidden md:flex bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
        onPress={onOpen}
        radius="full"
        isIconOnly
      >
        <AddSongIcon />
      </Button>

      {/* Mobile button */}
      <Button
        // className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
        // className="w-full bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full   font-normal shadow-md relative overflow-hidden group"
        className="sm:hidden w-full bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md justify-center"
        onPress={onOpen}
        radius="full"
        isIconOnly
        startContent={<AddSongIcon />}
      >
        Новая партитура
      </Button>


      <Modal
        isDismissable={false}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center"
        size="3xl"
        backdrop="blur"
        classNames={{
          base: "shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl",
        }}
      >
        <ModalContent className="p-10 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl">
          {(onClose) => (
            <>
              <div className="absolute top-3 left-2 z-50">
                <Pattern width={86} height={80} className="opacity-80" />
              </div>

              {/* Заголовок */}
              <ModalHeader className="p-0 flex flex-col text-center justify-center font-header gap-4">
                Добавить новую партитуру
              </ModalHeader>

              <ModalBody>
                <div className="space-y-6">
                  {/* Название и категория */}
                  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0 items-start">
                    <Input
                      isRequired
                      isInvalid={validationErrors.name}
                      errorMessage={
                        validationErrors.name
                          ? "Введите название партитуры!"
                          : ""
                      }
                      label="Название"
                      labelPlacement="outside"
                      placeholder="Введите название партитуры"
                      onChange={(e) => {
                        setName(e.target.value);
                        if (validationErrors.name)
                          setValidationErrors((prev) => ({
                            ...prev,
                            name: false,
                          }));
                      }}
                      className="input-header mb-0"
                    />

                    <Select
                      isRequired
                      isInvalid={validationErrors.category}
                      errorMessage={
                        validationErrors.category ? "Выберите категорию!" : ""
                      }
                      label={<span>Категория</span>}
                      placeholder="Выберите категорию"
                      labelPlacement="outside"
                      scrollShadowProps={{ isEnabled: false }}
                      onSelectionChange={(keys) => {
                        setCategory(Array.from(keys)[0] as string);
                        if (validationErrors.category)
                          setValidationErrors((prev) => ({
                            ...prev,
                            category: false,
                          }));
                      }}
                      className="input-header mb-0 "
                    >
                      {songs.map((song) => (
                        <SelectItem
                          className="input-header"
                          key={song.key}
                          textValue={song.label}
                        >
                          {song.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  {/* Авторы */}
                  <div className="mt-4 rounded-xl bg-white/10 p-4 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Автор музыки"
                      labelPlacement="outside"
                      placeholder="Введите автора"
                      description={
                        <span className="text-gray-600">
                          Полное имя и фамилия, напр.: Иван Иванов
                        </span>
                      }
                      onChange={(e) => setAuthor(e.target.value)}
                      className="input-header mb-0"
                    />
                    <Input
                      label="Автор слов"
                      labelPlacement="outside"
                      placeholder="Введите автора"
                      description={
                        <span className="text-gray-600 ">
                          Полное имя и фамилия, напр.: Иван Иванов
                        </span>
                      }
                      onChange={(e) => setAuthorLyrics(e.target.value)}
                      className="input-header mb-0"
                    />
                    <Input
                      label="Автор аранжировки"
                      labelPlacement="outside"
                      placeholder="Введите автора"
                      description={
                        <span className="text-gray-600">
                          Полное имя и фамилия, напр.: Иван Иванов
                        </span>
                      }
                      onChange={(e) => setAuthorArrange(e.target.value)}
                      className="input-header mb-0"
                    />
                  </div>

                  <div className="mt-4">
                    <MyDropzone
                      className="mt-4  rounded-xl bg-white/10 p-4 shadow-lg "
                      cardClassName="bg-transparent shadow-none border-none !important"
                      onFileSelect={(file) => {
                        setSelectedFile(file);
                        if (validationErrors.file)
                          setValidationErrors((prev) => ({
                            ...prev,
                            file: false,
                          }));
                      }}
                      onPreview={onOpenPreview}
                      hasError={validationErrors.file}
                    />
                    {validationErrors.file && (
                      <div className="text-tiny text-danger text-center mt-2 input-header">
                        Пожалуйста, загрузите файл!
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="flex justify-center">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42]  text-white shadow-lg input-header"
                  onPress={() => handleSave(onClose)}
                >
                  Добавить в базу
                </Button>
              </ModalFooter>

              <div className="absolute bottom-3 right-2 z-50">
                <Pattern
                  width={86}
                  height={76}
                  className="scale-y-[-1] scale-x-[-1] opacity-80"
                />
              </div>
            </>
          )}
        </ModalContent>
      </Modal>

      <ModalFilePreviewer
        isOpen={isPreviewOpen}
        onClose={onClosePreview}
        selectedFile={selectedFile}
      />
    </>
  );
}
