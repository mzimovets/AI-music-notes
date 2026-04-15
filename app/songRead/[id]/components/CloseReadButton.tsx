"use client";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { useState } from "react";
import { CloseIcon } from "@/app/stackView/[id]/components/icon/CloseIcon";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

export const CloseReadButton = () => {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onPress={() => setIsOpen(true)}
        isIconOnly
        type="button"
        className="
  group
  flex items-center justify-center
  w-10 h-10
  rounded-full
  bg-red-50 text-red-400
  border border-red-200
shadow-[0_4px_12px_rgba(0,0,0,0.18)]
  hover:shadow-[0_6px_16px_rgba(0,0,0,0.22)]
  transition-all duration-200
  hover:bg-red-100 hover:border-red-300
  active:scale-95
"
      >
        <CloseIcon className="w-5 h-5 text-red-400 group-hover:text-red-700 transition-colors" />
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col items-center text-center gap-2 pt-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#BD9673] to-[#7D5E42] flex items-center justify-center shadow-lg">
                  <CloseIcon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Закрыть</h3>
                <p className="text-gray-600 text-base max-w-xs input-header">
                  Вы уверены, что хотите выйти из просмотра?
                </p>
              </ModalHeader>

              <ModalFooter className="flex justify-center gap-4 pb-6">
                <Button
                  variant="bordered"
                  onPress={onClose}
                  className="border-white/50 bg-white/40 backdrop-blur-md hover:bg-white/60 input-header"
                >
                  Отмена
                </Button>

                <Button
                  className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md hover:shadow-lg transition-all input-header"
                  onPress={() => {
                    onClose();
                    router.back();
                  }}
                >
                  Закрыть
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
