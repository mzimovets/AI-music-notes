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
  addToast,
} from "@heroui/react";
import { Pattern } from "@/components/pattern";
import { useRouter } from "next/navigation";
import { saveStack } from "@/actions/actions";
import { StackIcon } from "./icons/StackIcon";
import { enqueue } from "@/lib/offline-queue";

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

  const handleSave = async () => {
    if (!stackName.trim()) {
      setValidationError(true);
      return;
    }

    const id = Math.random().toString();
    setIsSaved(true);

    if (!navigator.onLine) {
      // Новая стопка офлайн — страница не закэширована, идём на главную
      enqueue({ type: "stack.create", id, name: stackName });
      addToast({
        title: <span className="font-bold text-white">Сохранено офлайн</span>,
        description: (
          <span className="text-white">
            «{stackName}» добавится на сервер при восстановлении соединения
          </span>
        ),
        timeout: 4000,
        classNames: { base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white" },
      });
      onConfirm(stackName);
      onClose();
      router.push("/");
      return;
    }

    try {
      await saveStack(stackName, id, window.location.pathname);
      onConfirm(stackName);
      router.push(`/stack/${id}`);
    } catch (e) {
      // navigator.onLine может быть true даже без интернета — сохраняем офлайн
      console.warn("[Stack] Сеть недоступна, сохраняем офлайн:", e);
      enqueue({ type: "stack.create", id, name: stackName });
      onConfirm(stackName);
      router.push("/");
    }
    onClose();
  };

  return (
    <Modal
      isDismissable={false}
      size="lg"
      isOpen={isOpen}
      backdrop="blur"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      classNames={{
        wrapper: "flex items-center justify-center",
        base: "shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl",
      }}
    >
      <ModalContent className="p-10 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl">
        <div className="absolute top-0 left-0 pt-2 pl-2 z-0 pointer-events-none">
          <Pattern width={86} height={80} className="opacity-80" />
        </div>

        <ModalHeader className="pt-0 w-full flex flex-col items-center text-center gap-4 justify-center font-header text-lg font-bold">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#BD9673] to-[#7D5E42] flex items-center justify-center shadow-lg">
            <StackIcon className="w-7 h-7 text-white" />
          </div>
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
          <Button
            type="submit"
            onPress={onClose}
            className="input-header bg-white/70 "
          >
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
            width={86}
            height={76}
            className="scale-y-[-1] scale-x-[-1] opacity-80"
          />
        </div>
      </ModalContent>
    </Modal>
  );
};

export default StackAddModal;
