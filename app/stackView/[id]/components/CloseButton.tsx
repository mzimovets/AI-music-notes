"use client";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalFooter } from "@heroui/modal";
import { CloseIcon } from "./icon/CloseIcon";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
import { removeStack } from "@/actions/actions";
import { enqueue } from "@/lib/offline-queue";

export const CloseButton = ({ forceVisible = true }: { forceVisible?: boolean }) => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { stackResponse } = useStackContext();

  const [isOpen, setIsOpen] = useState(false);

  const handleCloseStack = async () => {
    if (!stackResponse?.doc?.songs?.length) {
      if (!navigator.onLine) {
        enqueue({ type: "stack.delete", id: params.id });
      } else {
        await removeStack(params.id);
      }
      window.dispatchEvent(new CustomEvent("sw-delete-stack", { detail: params.id }));
    }

    setIsOpen(false);
    router.push("/");
  };

  return (
    <>
      <div
        className={`transform-gpu transition-all duration-200 ${
          forceVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      >
        {/*
          Нажимаемая область (56px) намеренно больше видимого кружка (40px).
          Кнопки построены на react-aria: если палец в момент отпускания
          оказался за границей элемента, нажатие отменяется — а по краю
          небольшой кнопки палец соскакивал наружу постоянно, и закрыть
          программу с первого раза не получалось. Запас по 8px с каждой
          стороны прозрачный, внешне ничего не меняется
        */}
        <Button
          onPress={() => setIsOpen(true)}
          isIconOnly
          // Кнопка состоит из одного значка, и без подписи у неё нет имени:
          // её не назовёт программа чтения с экрана и не найдёт проверка
          aria-label="Закрыть программу"
          type="button"
          disableRipple
          variant="light"
          radius="full"
          disableAnimation
          className="group w-14 h-14 min-w-0 p-0 !bg-transparent !shadow-none border-0 data-[hover=true]:!bg-transparent data-[pressed=true]:!bg-transparent flex items-center justify-center"
        >
          <span
            className="
        flex items-center justify-center
        w-10 h-10
        rounded-full
        bg-white/30
        backdrop-blur-lg
        border border-white/40
        shadow-[0_1px_3px_rgba(0,0,0,0.08),0_6px_18px_rgba(0,0,0,0.10)]
        transition-all duration-200
        group-hover:bg-white/40
        group-hover:shadow-[0_2px_5px_rgba(0,0,0,0.10),0_10px_24px_rgba(0,0,0,0.14)]
        group-active:scale-95
      "
          >
            <CloseIcon className="w-5 h-5 text-red/70 group-hover:text-red transition-colors" />
          </span>
        </Button>
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="center"
        backdrop="blur"
        size="lg"
        // Своя кнопка закрытия в углу не нужна: внизу уже есть «Отмена»
        hideCloseButton
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
