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
  useDisclosure,
} from "@heroui/react";
import { Pattern } from "@/components/pattern";
import { useRouter } from "next/navigation";

interface StackAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stackName: string) => void;
}

const StackAddModal: React.FC<StackAddModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { onOpenChange } = useDisclosure();
  const [stackName, setStackName] = useState("");
  const [validationError, setValidationError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen && !isSaved) {
      setStackName("");
      setValidationError(false);
    }
    if (!isOpen) setIsSaved(false);
  }, [isOpen, isSaved]);

  const handleSave = () => {
    if (!stackName.trim()) {
      setValidationError(true);
      return;
    }
    setIsSaved(true);
    onConfirm(stackName);
    router.push("/stack");
    onClose();
  };

  return (
    <Modal
      isDismissable={false}
      size="lg"
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      classNames={{
        wrapper: "flex items-center justify-center",
        base: "shadow-2xl",
        backdrop:
          "bg-linear-to-t from-[#7D5E42] via-[#BD9673]/50 to-[#BD9673]/10 backdrop-blur-sm",
      }}
    >
      <ModalContent className="p-10">
        <div className="absolute top-0 left-0 pt-2 pl-2 z-0 pointer-events-none">
          <Pattern width={60} height={55} className="opacity-80" />
        </div>

        <ModalHeader className="w-full flex justify-center font-header text-lg font-bold">
          Создать новую стопку
        </ModalHeader>

        <ModalBody>
          <Input
            type="text"
            value={stackName}
            onChange={(e) => {
              setStackName(e.target.value);
              if (validationError) setValidationError(false);
            }}
            placeholder="Введите название стопки"
            label="Название стопки"
            labelPlacement="outside"
            isRequired
            isInvalid={validationError}
            errorMessage={validationError ? "Введите название!" : ""}
            className="w-full input-header"
          />
        </ModalBody>

        <ModalFooter className="flex justify-center gap-4 mt-4">
          <Button type="submit" onPress={onClose} className="input-header">
            Отмена
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-lg input-header"
            onPress={handleSave}
          >
            Создать
          </Button>
        </ModalFooter>

        <div className="absolute bottom-3 right-2 z-50">
          <Pattern
            width={60}
            height={55}
            className="scale-y-[-1] scale-x-[-1] opacity-80"
          />
        </div>
      </ModalContent>
    </Modal>
  );
};

export default StackAddModal;
