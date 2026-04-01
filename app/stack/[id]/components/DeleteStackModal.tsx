"use client";
import {
  Button,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { useState } from "react";
import { useStackContext } from "./StackContextProvider";
import { removeStack } from "@/actions/actions";
import { enqueue } from "@/lib/offline-queue";
import { useParams, useRouter } from "next/navigation";
import { TrashBinIcon } from "./icons/TrashBinIcon";

export const DeleteStackModal = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isDeleting, setIsDeleting] = useState(false);
  const { stackResponse, isDeleteModalOpen, setIsDeleteModalOpen } =
    useStackContext();

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      if (!navigator.onLine) {
        enqueue({ type: "stack.delete", id: params.id });
        window.dispatchEvent(new CustomEvent("sw-delete-stack", { detail: params.id }));
        router.push(`/`);
        return;
      }
      const response = await removeStack(params.id);
      if (response) {
        window.dispatchEvent(new CustomEvent("sw-delete-stack", { detail: params.id }));
        router.push(`/`);
        router.refresh();
      } else {
        setIsDeleting(false);
        console.error("Ошибка при удалении стопки");
      }
    } catch (error) {
      console.error("Ошибка при удалении стопки:", error);
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isDeleteModalOpen}
      onOpenChange={setIsDeleteModalOpen}
      placement="center"
      backdrop="blur"
      classNames={{ backdrop: "bg-black/40" }}
    >
      <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl">
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col items-center text-center gap-2 pt-6">
              <div className="w-16 h-16 text-white rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
                <div className="scale-140">
                  <TrashBinIcon />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                Удалить стопку?
              </h3>
              <p className="text-gray-600 text-base input-header max-w-xs">
                Несохранённые изменения будут потеряны
              </p>
            </ModalHeader>

            <ModalFooter className="flex justify-center gap-4 pb-6">
              <Button
                variant="bordered"
                onPress={onClose}
                disabled={isDeleting}
                className="border-white/50 bg-white/40 backdrop-blur-md hover:bg-white/60 input-header"
              >
                Отмена
              </Button>
              <Button
                onPress={handleConfirmDelete}
                className="bg-gradient-to-r from-red-400 to-red-500 text-white shadow-md hover:shadow-lg transition-all input-header"
                isLoading={isDeleting}
              >
                {isDeleting ? "Удаление..." : "Да, удалить"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
