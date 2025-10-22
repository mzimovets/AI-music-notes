"use client";
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
import { PdfViewer } from "./pdfViewer";

export default function ModalAddScore() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  return (
    <>
      <Button onPress={onOpen}>Добавить партитуру</Button>
      <Modal
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement={"top"}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center">
                Добавить новую партитуру
              </ModalHeader>
              <ModalBody>
                <Input
                  isRequired
                  errorMessage="Пожалуйста, введите название!"
                  label="Название"
                  labelPlacement="outside"
                  name="nameScore"
                  placeholder="Введите название"
                  type="nameScore"
                />
                <Input
                  label="Автор"
                  labelPlacement="outside"
                  placeholder="Введите автора"
                  type="autorScore"
                />
                <MyDropzone />
                <Button>Предпросмотр</Button>
                <PdfViewer />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button color="primary" onPress={onClose}>
                  Action
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
