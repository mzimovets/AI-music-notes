"use client";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

import ModalAddScore from "@/app/home/modalAddScore";
import StackNameModal from "@/components/modalAddStack";
import {
  getChatVisibilityFromDatabase,
  getStoredChatVisibility,
  isChatEligibleUser,
  saveChatVisibilityToDatabase,
  setStoredChatVisibility,
  syncChatVisibilityFromDatabase,
} from "@/lib/chat-settings";

import { usePathname, useRouter } from "next/navigation";
import { CamertonLogo } from "./camertonSvg";
import { useEffect, useState } from "react";
import React from "react";
import { StackIcon } from "./icons/StackIcon";
import ExitIcon from "./icons/ExitIcon";
import SettingsIcon from "./icons/SettingsIcon";

export const Navbar = () => {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stackName, setStackName] = useState("");
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isExitStackModalOpen, setIsExitStackModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const username = session?.user?.name?.toLowerCase() || "";

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
  const showSettingsButton = isChatEligibleUser(username);

  useEffect(() => {
    if (!showSettingsButton) {
      setIsChatVisible(true);
      return;
    }

    setIsChatVisible(getStoredChatVisibility(username));

    let isCancelled = false;

    syncChatVisibilityFromDatabase(username)
      .then((nextValue) => {
        if (!isCancelled) {
          setIsChatVisible(nextValue);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [showSettingsButton, username]);

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

  const handleChatVisibilityChange = (isSelected: boolean) => {
    setIsChatVisible(isSelected);
    setStoredChatVisibility(username, isSelected);

    saveChatVisibilityToDatabase(username, isSelected)
      .then((nextValue) => {
        setIsChatVisible(nextValue);
      })
      .catch(() => {
        getChatVisibilityFromDatabase(username)
          .then((nextValue) => {
            setIsChatVisible(nextValue);
            setStoredChatVisibility(username, nextValue);
          })
          .catch(() => {});
      });
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
                  onPress={handleOpenStack}
                  radius="full"
                  isIconOnly
                  className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
                >
                  <StackIcon color="white" />
                </Button>
              )}
            {showSettingsButton && (
              <Button
                onPress={() => setIsSettingsModalOpen(true)}
                radius="full"
                isIconOnly
                className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
              >
                <SettingsIcon color="white" />
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
      <Modal
        isOpen={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.2)] rounded-2xl">
          <ModalHeader className="flex flex-col gap-1 pt-6">
            <h3 className="text-2xl font-bold text-gray-900">Настройки</h3>
            <p className="text-sm text-gray-600 input-header">
              Управление отображением личного чата
            </p>
          </ModalHeader>
          <ModalBody className="pb-2">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#eadfd4] bg-[#fcfaf8] px-4 py-4">
              <div>
                <p className="text-base font-semibold text-[#473424]">Показывать чат</p>
                <p className="text-sm text-[#8b735d]">
                  Если выключить, кнопка чата и окно чата будут скрыты
                </p>
              </div>
              <Switch
                isSelected={isChatVisible}
                onValueChange={handleChatVisibilityChange}
                aria-label="Показывать чат"
              />
            </div>
          </ModalBody>
          <ModalFooter className="pt-0 pb-6">
            <Button
              className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md hover:shadow-lg transition-all input-header"
              onPress={() => setIsSettingsModalOpen(false)}
            >
              Закрыть
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
