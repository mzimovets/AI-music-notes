"use client";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalFooter } from "@heroui/modal";
import { CloseIcon } from "./icon/CloseIcon";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
import { updateStack } from "@/actions/actions";

export const CloseButton = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { stackSongs, stackName, stackCover } = useStackContext();

  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsVisible(currentY < lastScrollY || currentY === 0);
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleCloseStack = async () => {
    // Гарантируем, что stack всегда массив
    const safeStack = Array.isArray(stackSongs) ? stackSongs : [];

    // Определяем флаг удаления только если стопка пустая
    const shouldDelete = safeStack.length === 0;

    await updateStack({
      stack: safeStack, // всегда массив
      isPublished: false,
      id: params.id,
      cover: stackCover,
      name: stackName || "Стопка",
      delete: shouldDelete,
    });

    setIsOpen(false);
    router.push("/");
  };

  return (
    <>
      <div
        className={`transition-all duration-200 ${
          isVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      >
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
      "
        >
          <CloseIcon className="w-5 h-5 text-red/70 group-hover:text-red transition-colors" />
        </Button>
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="center"
        backdrop="blur"
        classNames={{ backdrop: "bg-black/40" }}
      >
        <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col items-center text-center gap-2 pt-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#BD9673] to-[#7D5E42] flex items-center justify-center shadow-lg">
                  <CloseIcon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Выйти?</h3>
                <p className="text-gray-600 text-base max-w-xs input-header">
                  Несохранённые изменения могут быть потеряны
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
                  onPress={handleCloseStack}
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
