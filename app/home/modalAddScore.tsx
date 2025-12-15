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
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";

import MyDropzone from "./dropzone";
import ModalFilePreviewer from "./modalFilePreviewer"; // подключаем вторую модалку
import { addSong } from "@/actions/actions";
import { Song } from "@/lib/types";

export default function ModalAddScore() {
  // управление первой модалкой
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  // управление второй модалкой (предпросмотр)
  const {
    isOpen: isPreviewOpen,
    onOpen: onOpenPreview,
    onClose: onClosePreview,
  } = useDisclosure();

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isSaved, setIsSaved] = React.useState(false);

  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");

  React.useEffect(() => {
    if (!isOpen && !isSaved) {
      setSelectedFile(null);
    }
    if (!isOpen) {
      setIsSaved(false);
    }
  }, [isOpen, isSaved]);

  const changeName = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const changeAuthor = (e: ChangeEvent<HTMLInputElement>) => {
    setAuthor(e.target.value);
  };

  const handleSave = () => {
    const data: Song = {
      name: name,
      author: author,
      file: selectedFile,
      docType: "song",
    };
    console.log("Saving data", data);
    setIsSaved(true);
    addSong(data);
  };

  const songs = [
    {
      label: "Духовные канты",
      key: "spiritual_chants",
    },
    {
      label: "Пасха",
      key: "easter",
    },
    {
      label: "Колядки",
      key: "carols",
    },
    {
      label: "Народные",
      key: "folk",
    },
    {
      label: "Советские",
      key: "soviet",
    },
    {
      label: "Военные",
      key: "military",
    },
    {
      label: "Детские",
      key: "childrens",
    },
  ];

  return (
    <>
      <Button
        className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full px-6 py-2 text-2xl font-normal shadow-md w-auto min-w-0"
        onPress={onOpen}
      >
        +
      </Button>

      {/* первая модалка */}
      <Modal
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="top"
        size="3xl"
        classNames={{
          backdrop:
            "bg-linear-to-t from-[#BD9673] to-[#BD9673]/10 backdrop-opacity-20",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col text-center justify-center font-header gap-4">
                Добавить новую партитуру
              </ModalHeader>
              <ModalBody>
                <Autocomplete
                  isRequired
                  // className="max-w-xs"
                  defaultItems={songs}
                  // defaultSelectedKey="cat"
                  label="Категория"
                  placeholder="Выберите категорию"
                  labelPlacement="outside-top"
                >
                  {(item) => (
                    <AutocompleteItem key={item.key}>
                      {item.label}
                    </AutocompleteItem>
                  )}
                </Autocomplete>
                <Input
                  isRequired
                  label="Название"
                  labelPlacement="outside"
                  placeholder="Введите название"
                  onChange={changeName}
                />
                <Input
                  label="Автор"
                  labelPlacement="outside"
                  placeholder="Введите автора"
                  onChange={changeAuthor}
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
                <MyDropzone onFileSelect={setSelectedFile} />

                {/* Кнопка предпросмотра */}
                <Button onPress={onOpenPreview} isDisabled={!selectedFile}>
                  Предпросмотр
                </Button>
              </ModalBody>
              <ModalFooter>
                <Button
                  className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42]"
                  onPress={handleSave}
                >
                  Добавить
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* вторая модалка — предпросмотр */}
      <ModalFilePreviewer
        isOpen={isPreviewOpen}
        onClose={onClosePreview}
        selectedFile={selectedFile}
      />
    </>
  );
}
