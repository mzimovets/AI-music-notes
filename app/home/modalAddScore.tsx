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
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="text-center">
                Добавить новую партитуру
              </ModalHeader>
              <ModalBody>
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
                <MyDropzone onFileSelect={setSelectedFile} />

                {/* Кнопка предпросмотра */}
                <Button onPress={onOpenPreview} isDisabled={!selectedFile}>
                  Предпросмотр
                </Button>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onOpenChange}>
                  Закрыть
                </Button>
                <Button color="primary" onPress={handleSave}>
                  Сохранить
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
