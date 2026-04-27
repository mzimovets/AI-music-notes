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
  Popover, 
  PopoverContent,
  Button,
  PopoverTrigger,
  useDisclosure
} from "@heroui/react";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

import ModalAddScore from "@/app/home/modalAddScore";
import StackNameModal from "@/components/modalAddStack";

import { usePathname, useRouter } from "next/navigation";
import { CamertonLogo } from "./camertonSvg";
import { useState } from "react";
import React from "react";
import { StackIcon } from "./icons/StackIcon";
import ExitIcon from "./icons/ExitIcon";
import { AddSongIcon } from "./icons/AddSongIcon";

export const NavbarNoteLib = () => {
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stackName, setStackName] = useState("");
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isExitStackModalOpen, setIsExitStackModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { isOpen: isModalAddScoreOpen, onOpen: onOpenModalAddScore, onOpenChange: onOpenChangeModalAddScore } = useDisclosure();

  const router = useRouter();
  const pathname = usePathname();

  const handleOpenStack = () => {
    setIsModalOpen(true);
  };

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
            {showStackButtons && (
              <Button
              className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
              onPress={onOpenModalAddScore}
              radius="full"
              isIconOnly
            >
              <AddSongIcon />
            </Button>
            )}
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
          <Popover placement="bottom-end" isOpen={isOpen} onOpenChange={setIsOpen}>
             <PopoverTrigger>
              <Button
              onPress={()=>{
                setIsOpen((prev)=>!prev)
              }}
                isIconOnly
                radius="full"
                variant="light"
                className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              </Button>
              </PopoverTrigger>
            <PopoverContent classNames={{ base: "bg-white/40 backdrop-blur-2xl border border-white/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] p-0" }}>
              <div className="flex flex-col gap-3 pt-2 pb-2 min-w-[180px]">
                {/* Кнопка Add Score */}
                {showStackButtons && (
                  <Button
                    className="w-full bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md justify-start gap-1.5 input-header px-4"
                    onPress={() => {
                      onOpenModalAddScore();
                      setIsOpen(false);
                    }}
                    radius="full"
                    startContent={<AddSongIcon />}
                  >
                    Новая партитура
                  </Button>
                )}

                {/* Кнопка Stack */}
                {showStackButtons &&
                  !pathname.startsWith("/stack") &&
                  !pathname.startsWith("/stackView") && (
                    <Button
                      onPress={() => {
                        handleOpenStack();
                        setIsOpen(false);
                      }}
                      radius="full"
                      className="w-full bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md justify-start gap-1.5 input-header px-4"
                      startContent={<StackIcon color="white" />}
                    >
                      Новая стопка
                    </Button>
                  )}

                {/* Кнопка Exit */}
                <Button
                  onPress={handleExit}
                  radius="full"
                  className="w-full bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md justify-start gap-1.5 input-header px-4"
                  startContent={<ExitIcon color="white" />}
                >
                  Выход
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </NavbarContent>
      </HeroUINavbar>
      
      <ModalAddScore isOpen={isModalAddScoreOpen} onOpen={onOpenModalAddScore} onOpenChange={onOpenChangeModalAddScore} />
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
