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
} from "@heroui/react";
import { useRouter } from "next/navigation";

import { StackIcon } from "./icons/StackIcon";

import { Pattern } from "@/components/pattern";

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

  const handleSave = async () => {
    if (!stackName.trim()) {
      setValidationError(true);

      return;
    }

    const id = Math.random().toString();

    setIsSaved(true);
    onConfirm(stackName);
    router.push(`/stack/${id}`);
    onClose();
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        wrapper: "flex items-center justify-center",
        base: "shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl",
      }}
      isDismissable={false}
      isOpen={isOpen}
      size="lg"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ModalContent className="p-10 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl">
        <div className="absolute top-0 left-0 pt-2 pl-2 z-0 pointer-events-none">
          <Pattern className="opacity-80" height={80} width={86} />
        </div>

        <ModalHeader className="pt-0 w-full flex flex-col items-center text-center gap-4 justify-center font-header text-lg font-bold">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#BD9673] to-[#7D5E42] flex items-center justify-center shadow-lg">
            <StackIcon className="w-7 h-7 text-white" />
          </div>
          Создать новую стопку
        </ModalHeader>
        <ModalBody>
          <Input
            isRequired
            className="w-full input-header"
            errorMessage={validationError ? "Введите название!" : ""}
            isInvalid={validationError}
            label="Название стопки"
            labelPlacement="outside"
            placeholder="Введите название стопки"
            type="text"
            value={stackName}
            onChange={(e) => {
              setStackName(e.target.value);
              if (validationError) setValidationError(false);
            }}
          />
        </ModalBody>
        <ModalFooter className="flex justify-center gap-4 mt-4">
          <Button
            className="input-header bg-white/70 "
            type="submit"
            onPress={onClose}
          >
            Отмена
          </Button>
          <Button
            className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-lg input-header"
            type="submit"
            onPress={handleSave}
          >
            Создать
          </Button>
        </ModalFooter>
        <div className="absolute bottom-3 right-2 z-50">
          <Pattern
            className="scale-y-[-1] scale-x-[-1] opacity-80"
            height={76}
            width={86}
          />
        </div>
      </ModalContent>
    </Modal>
  );
};

export default StackAddModal;
