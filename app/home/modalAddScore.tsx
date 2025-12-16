"use client";
import React, { ChangeEvent, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  useDisclosure,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";

import MyDropzone from "./dropzone";
import ModalFilePreviewer from "./modalFilePreviewer";
import { addSong } from "@/actions/actions";
import { Song } from "@/lib/types";
import { Pattern } from "@/components/pattern";

export default function ModalAddScore() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isPreviewOpen,
    onOpen: onOpenPreview,
    onClose: onClosePreview,
  } = useDisclosure();

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isSaved, setIsSaved] = React.useState(false);
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState(""); // Состояние для категории

  React.useEffect(() => {
    if (!isOpen && !isSaved) setSelectedFile(null);
    if (!isOpen) setIsSaved(false);
  }, [isOpen, isSaved]);

  const handleSave = (onClose: () => void) => {
    const data: Song = {
      name,
      author,
      file: selectedFile,
      docType: "song",
      category, // передаем категорию
    };
    setIsSaved(true);
    addSong(data);

    addToast({
      title: <span className="font-bold text-white">Партитура добавлена</span>,
      description: (
        <span className="text-white">
          <span className="font-bold">{name}</span> | {author}
        </span>
      ),
      timeout: 3000,
      classNames: {
        base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white",
      },
    });
    onClose();
  };

  const songs = [
    { label: "Духовные канты", key: "spiritual_chants" },
    { label: "Пасха", key: "easter" },
    { label: "Колядки", key: "carols" },
    { label: "Народные", key: "folk" },
    { label: "Советские", key: "soviet" },
    { label: "Военные", key: "military" },
    { label: "Детские", key: "childrens" },
  ];

  return (
    <>
      <Button
        className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full px-6 py-2 text-2xl font-normal shadow-md relative overflow-hidden group"
        onPress={onOpen}
      >
        <span className="relative z-10">+</span>
      </Button>

      <Modal
        isDismissable={false}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="top"
        size="3xl"
        classNames={{
          backdrop:
            "bg-linear-to-t from-[#7D5E42] via-[#BD9673]/50 to-[#BD9673]/10 backdrop-blur-sm",
        }}
      >
        <ModalContent className="p-10">
          {(onClose) => (
            <>
              <div className="absolute top-3 left-2 z-50">
                <Pattern width={60} height={55} className="opacity-80" />
              </div>
              <ModalHeader className="flex flex-col text-center justify-center font-header gap-4">
                Добавить новую партитуру
              </ModalHeader>
              <ModalBody>
                {/* Используем сетку для выравнивания */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                  {/* Название делаем на всю ширину (2 колонки) */}
                  <div className="md:col-span-2">
                    <Input
                      isRequired
                      label="Название"
                      labelPlacement="outside"
                      placeholder="Введите название партитуры"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {/* Категория (Dropdown) */}
                  <Select
                    isRequired
                    label="Категория"
                    placeholder="Выберите категорию"
                    labelPlacement="outside"
                    onSelectionChange={(keys) =>
                      setCategory(Array.from(keys)[0] as string)
                    }
                  >
                    {songs.map((song) => (
                      <SelectItem key={song.key} textValue={song.label}>
                        {song.label}
                      </SelectItem>
                    ))}
                  </Select>

                  <Input
                    label="Автор"
                    labelPlacement="outside"
                    placeholder="Введите автора"
                    onChange={(e) => setAuthor(e.target.value)}
                  />

                  <Input
                    label="Автор обработки"
                    labelPlacement="outside"
                    placeholder="Введите автора обработки"
                  />

                  <Input
                    label="Автор аранжировки"
                    labelPlacement="outside"
                    placeholder="Введите автора аранжировки"
                  />
                </div>

                {/* MyDropzone с кнопкой предпросмотра внутри - ПЕРЕДАЕМ onPreview */}
                <div className="mt-4">
                  <MyDropzone
                    onFileSelect={setSelectedFile}
                    onPreview={onOpenPreview}
                  />
                </div>

                {/* УДАЛИЛИ эту кнопку - теперь она в MyDropzone */}
                {/* <Button
                  onPress={onOpenPreview}
                  isDisabled={!selectedFile}
                  variant="flat"
                  className="w-full mt-2"
                >
                  Предпросмотр файла
                </Button> */}
              </ModalBody>
              <ModalFooter className="flex justify-center">
                <Button
                  className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-lg"
                  onPress={() => handleSave(onClose)}
                >
                  Добавить в базу
                </Button>
              </ModalFooter>
              <div className="absolute bottom-3 right-2 z-50">
                <Pattern
                  width={60}
                  height={55}
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
