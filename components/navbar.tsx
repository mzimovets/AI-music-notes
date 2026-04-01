"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
} from "@heroui/modal";
import {
  Popover, PopoverTrigger, PopoverContent,
  Button
} from "@heroui/react";



import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

import { Link } from "@heroui/link";

import ModalAddScore from "@/app/home/modalAddScore";
import StackNameModal from "@/components/modalAddStack";

import { usePathname, useRouter } from "next/navigation";
import { CamertonLogo } from "./camertonSvg";
import { useState } from "react";
import React from "react";
import { StackIcon } from "./icons/StackIcon";
import ExitIcon from "./icons/ExitIcon";

export const NavbarNoteLib = () => {
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stackName, setStackName] = useState("");
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isExitStackModalOpen, setIsExitStackModalOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const handleOpenStack = () => setIsModalOpen(true);

  const handleConfirmStack = () => {
    if (stackName.trim() === "") return;
    setIsModalOpen(false);
    router.push("/stack");
  };

  const handleExit = () => {
    setIsExitModalOpen(true);
  };

  const confirmExit = () => {
    signOut({ callbackUrl: "/authPage" });
  };

  const showStackButtons = session?.user?.role === "регент";

  const handleLogoClick = () => {
    if (pathname.startsWith("/stack")) {
      setIsExitStackModalOpen(true);
    } else {
      router.push("/");
    }
  };

  const handleExitStackConfirm = () => {
    setIsExitStackModalOpen(false);
    router.push("/");
  };

return (
    <>
      <HeroUINavbar
        maxWidth="xl"
        position="sticky"
        className="z-50 bg-navbar relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-gradient-to-r after:from-[#BD9673] after:to-[#7D5E42]"
      >
        <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLogoClick();
            }}
            style={{ display: "inline", cursor: "pointer" }}
          >
            <div className="flex items-center">
              <CamertonLogo className="h-10 w-10 sm:h-12 sm:w-12 -translate-y-1" />
              <p className="hidden sm:flex font-navbarBrand text-inherit text-sm sm:text-base">
                Нотная библиотека
              </p>
            </div>
          </div>
        </NavbarContent>

        {/* Десктопная версия кнопок */}
        <NavbarContent
          className="hidden sm:flex basis-1/5 sm:basis-full"
          justify="end"
        >
          <NavbarItem className="hidden md:flex gap-4">
            {showStackButtons && <ModalAddScore />}
            {showStackButtons &&
              !pathname.startsWith("/stack") &&
              !pathname.startsWith("/stackView") && (
                <Button
                  onPress={handleOpenStack}
                  radius="full"
                  isIconOnly
                  className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
                >
                  <StackIcon color="white" />
                </Button>
              )}
            <Button
              onPress={handleExit}
              radius="full"
              isIconOnly
              className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
            >
              <ExitIcon color="white" />
            </Button>
          </NavbarItem>
        </NavbarContent>

        {/* Мобильная версия - бургер-меню */}
        <NavbarContent className="flex sm:hidden" justify="end">
          <Popover placement="bottom-end">
            <PopoverTrigger>
              <Button
                isIconOnly
                radius="full"
                variant="light"
                // className="text-white"
                className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md justify-center"
              >
                =
                {/* <MenuIcon size={24} /> */}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col gap-2 p-3 min-w-[200px]">
              {/* Кнопка Add Score (если нужна) */}
              {showStackButtons && (
                <div className="w-full">
                  <ModalAddScore />
                </div>
              )}
              
              {/* Кнопка Stack */}
              {showStackButtons &&
                !pathname.startsWith("/stack") &&
                !pathname.startsWith("/stackView") && (
                  <Button
                    onPress={handleOpenStack} // Надо как-то делать чтобы popover закрывался
                    radius="full"
                    className="w-full bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md justify-center"
                    startContent={<StackIcon color="white" />}
                  >
                    Новая стопка
                  </Button>
                )}
              
              {/* Кнопка Exit */}
              <Button
                onPress={handleExit}
                radius="full"
                className="w-full bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md justify-center"
                startContent={<ExitIcon color="white" />}
              >
                Выход
              </Button>
            </PopoverContent>
          </Popover>
        </NavbarContent>
      </HeroUINavbar>
      
      <StackNameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stackName={stackName}
        setStackName={setStackName}
        onConfirm={handleConfirmStack}
      />
      <Modal
        isOpen={isExitModalOpen}
        onOpenChange={setIsExitModalOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col items-center text-center gap-4 pt-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#BD9673] to-[#7D5E42] flex items-center justify-center shadow-lg">
                  <ExitIcon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Выйти</h3>
                <p className="text-gray-600 text-base max-w-xs input-header">
                  Вы действительно хотите выйти из аккаунта?
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
                  onPress={confirmExit}
                >
                  Выйти
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <Modal
        isOpen={isExitStackModalOpen}
        onOpenChange={setIsExitStackModalOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col items-center text-center gap-4 pt-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#BD9673] to-[#7D5E42] flex items-center justify-center shadow-lg">
                  <ExitIcon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Покинуть стопку
                </h3>
                <p className="text-gray-600 text-base max-w-xs input-header">
                  Вы действительно хотите выйти из стопки и перейти на главную
                  страницу?
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
                  onPress={handleExitStackConfirm}
                >
                  Выйти
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
