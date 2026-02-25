import { Button } from "@heroui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { CloseIcon } from "./icon/CloseIcon";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const CloseButton = () => {
  const router = useRouter();
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
      bg-white/30
      backdrop-blur-lg
      border border-white/40
      shadow-[0_4px_12px_rgba(0,0,0,0.18)]
      transition-all duration-200
      hover:bg-white/40
      hover:shadow-[0_6px_16px_rgba(0,0,0,0.22)]
      active:scale-95
      bg-red-50 text-red-400
      border border-red-200
      hover:bg-red-100 hover:border-red-300
      transition-all
      shadow-sm
    "
      >
        <CloseIcon className="w-5 h-5 text-red/70 group-hover:text-red transition-colors" />
      </Button>

      <Modal isOpen={isOpen} onOpenChange={setIsOpen} placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex justify-center">
                Закрыть страницу?
              </ModalHeader>

              <ModalBody className="text-center">
                Вы уверены, что хотите выйти?
              </ModalBody>

              <ModalFooter className="flex justify-center gap-4">
                <Button variant="bordered" radius="full" onPress={onClose}>
                  Отмена
                </Button>

                <Button
                  radius="full"
                  className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white"
                  onPress={() => {
                    onClose();
                    router.push("/");
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
