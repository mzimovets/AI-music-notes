"use client";

import React, { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalFooter } from "@heroui/modal";

import { CamertonLogo } from "./camertonSvg";
import { StackIcon } from "./icons/StackIcon";
import ExitIcon from "./icons/ExitIcon";

import ModalAddScore from "@/app/home/modalAddScore";
import StackNameModal from "@/components/modalAddStack";

export const Navbar = () => {
  const { data: session } = useSession();
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
        className="z-50 bg-navbar relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-gradient-to-r after:from-[#BD9673] after:to-[#7D5E42]"
        maxWidth="xl"
        position="sticky"
      >
        <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
          <div
            role="button"
            style={{ display: "inline", cursor: "pointer" }}
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLogoClick();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleLogoClick();
              }
            }}
          >
            <div className="flex items-center">
              <CamertonLogo className="h-10 w-10 sm:h-12 sm:w-12 -translate-y-1" />
              <p className="font-navbarBrand text-inherit text-sm sm:text-base">
                Нотная библиотека
              </p>
            </div>
          </div>
        </NavbarContent>

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
                  isIconOnly
                  className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
                  radius="full"
                  onPress={handleOpenStack}
                >
                  <StackIcon color="white" />
                </Button>
              )}
            <Button
              isIconOnly
              className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
              radius="full"
              onPress={handleExit}
            >
              <ExitIcon color="white" />
            </Button>
          </NavbarItem>
        </NavbarContent>
      </HeroUINavbar>
      <StackNameModal
        isOpen={isModalOpen}
        setStackName={setStackName}
        stackName={stackName}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmStack}
      />
      <Modal
        backdrop="blur"
        isOpen={isExitModalOpen}
        placement="center"
        onOpenChange={setIsExitModalOpen}
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
                  className="border-white/50 bg-white/40 backdrop-blur-md hover:bg-white/60 input-header"
                  variant="bordered"
                  onPress={onClose}
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
        backdrop="blur"
        isOpen={isExitStackModalOpen}
        placement="center"
        onOpenChange={setIsExitStackModalOpen}
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
                  className="border-white/50 bg-white/40 backdrop-blur-md hover:bg-white/60 input-header"
                  variant="bordered"
                  onPress={onClose}
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
