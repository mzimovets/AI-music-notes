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
import { QRModal } from "@/app/home/QRModal";
import { useLocalServer } from "@/hooks/useLocalServer";

import { usePathname, useRouter } from "next/navigation";
import { CamertonLogo } from "./camertonSvg";
import { useState, useEffect } from "react";
import React from "react";
import { StackIcon } from "./icons/StackIcon";
import ExitIcon from "./icons/ExitIcon";
import { AddSongIcon } from "./icons/AddSongIcon";

// Иконка QR кода для входа
function QRIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 16.9C2 15.5906 2 14.9359 2.29472 14.455C2.45963 14.1859 2.68589 13.9596 2.955 13.7947C3.43594 13.5 4.09063 13.5 5.4 13.5H6.5C8.38562 13.5 9.32843 13.5 9.91421 14.0858C10.5 14.6716 10.5 15.6144 10.5 17.5V18.6C10.5 19.9094 10.5 20.5641 10.2053 21.045C10.0404 21.3141 9.81411 21.5404 9.545 21.7053C9.06406 22 8.40937 22 7.1 22C5.13594 22 4.15391 22 3.4325 21.5579C3.02884 21.3106 2.68945 20.9712 2.44208 20.5675C2 19.8461 2 18.8641 2 16.9Z" stroke="white" strokeWidth="1.5"/>
      <path d="M13.5 5.4C13.5 4.09063 13.5 3.43594 13.7947 2.955C13.9596 2.68589 14.1859 2.45963 14.455 2.29472C14.9359 2 15.5906 2 16.9 2C18.8641 2 19.8461 2 20.5675 2.44208C20.9712 2.68945 21.3106 3.02884 21.5579 3.4325C22 4.15391 22 5.13594 22 7.1C22 8.40937 22 9.06406 21.7053 9.545C21.5404 9.81411 21.3141 10.0404 21.045 10.2053C20.5641 10.5 19.9094 10.5 18.6 10.5H17.5C15.6144 10.5 14.6716 10.5 14.0858 9.91421C13.5 9.32843 13.5 8.38562 13.5 6.5V5.4Z" stroke="white" strokeWidth="1.5"/>
      <path d="M16.5 6.25C16.5 5.73459 16.5 5.47689 16.6291 5.29493C16.6747 5.23072 16.7307 5.17466 16.7949 5.12911C16.9769 5 17.2346 5 17.75 5C18.2654 5 18.5231 5 18.7051 5.12911C18.7693 5.17466 18.8253 5.23072 18.8709 5.29493C19 5.47689 19 5.73459 19 6.25C19 6.76541 19 7.02311 18.8709 7.20507C18.8253 7.26928 18.7693 7.32534 18.7051 7.37089C18.5231 7.5 18.2654 7.5 17.75 7.5C17.2346 7.5 16.9769 7.5 16.7949 7.37089C16.7307 7.32534 16.6747 7.26928 16.6291 7.20507C16.5 7.02311 16.5 6.76541 16.5 6.25Z" fill="white"/>
      <path d="M12.75 22C12.75 22.4142 13.0858 22.75 13.5 22.75C13.9142 22.75 14.25 22.4142 14.25 22H12.75ZM14.3889 13.8371L14.8055 14.4607L14.8055 14.4607L14.3889 13.8371ZM13.8371 14.3889L13.2135 13.9722L13.2135 13.9722L13.8371 14.3889ZM19 12.75H17V14.25H19V12.75ZM12.75 19V22H14.25V19H12.75ZM17 12.75C16.3134 12.75 15.742 12.7491 15.281 12.796C14.8075 12.8441 14.3682 12.9489 13.9722 13.2135L14.8055 14.4607C14.914 14.3882 15.078 14.3244 15.4328 14.2883C15.8002 14.2509 16.2822 14.25 17 14.25V12.75ZM14.25 17C14.25 16.2822 14.2509 15.8002 14.2883 15.4328C14.3244 15.078 14.3882 14.914 14.4607 14.8055L13.2135 13.9722C12.9489 14.3682 12.8441 14.8075 12.796 15.281C12.7491 15.742 12.75 16.3134 12.75 17H14.25ZM13.9722 13.2135C13.6719 13.4141 13.4141 13.6719 13.2135 13.9722L14.4607 14.8055C14.5519 14.669 14.669 14.5519 14.8055 14.4607L13.9722 13.2135Z" fill="white"/>
      <path d="M22.75 13.5C22.75 13.0858 22.4142 12.75 22 12.75C21.5858 12.75 21.25 13.0858 21.25 13.5H22.75ZM20.7654 21.8478L21.0524 22.5407L21.0524 22.5407L20.7654 21.8478ZM21.8478 20.7654L21.1548 20.4784V20.4784L21.8478 20.7654ZM17 22.75H19V21.25H17V22.75ZM22.75 17V13.5H21.25V17H22.75ZM19 22.75C19.4557 22.75 19.835 22.7504 20.1454 22.7292C20.4625 22.7076 20.762 22.661 21.0524 22.5407L20.4784 21.1548C20.4012 21.1868 20.284 21.2163 20.0433 21.2327C19.7958 21.2496 19.4762 21.25 19 21.25V22.75ZM21.25 19C21.25 19.4762 21.2496 19.7958 21.2327 20.0433C21.2163 20.284 21.1868 20.4012 21.1548 20.4784L22.5407 21.0524C22.661 20.762 22.7076 20.4625 22.7292 20.1454C22.7504 19.835 22.75 19.4557 22.75 19H21.25ZM21.0524 22.5407C21.7262 22.2616 22.2616 21.7262 22.5407 21.0524L21.1548 20.4784C21.028 20.7846 20.7846 21.028 20.4784 21.1549L21.0524 22.5407Z" fill="white"/>
      <path d="M2 7.1C2 5.13594 2 4.15391 2.44208 3.4325C2.68945 3.02884 3.02884 2.68945 3.4325 2.44208C4.15391 2 5.13594 2 7.1 2C8.40937 2 9.06406 2 9.545 2.29472C9.81411 2.45963 10.0404 2.68589 10.2053 2.955C10.5 3.43594 10.5 4.09063 10.5 5.4V6.5C10.5 8.38562 10.5 9.32843 9.91421 9.91421C9.32843 10.5 8.38562 10.5 6.5 10.5H5.4C4.09063 10.5 3.43594 10.5 2.955 10.2053C2.68589 10.0404 2.45963 9.81411 2.29472 9.545C2 9.06406 2 8.40937 2 7.1Z" stroke="white" strokeWidth="1.5"/>
      <path d="M5 6.25C5 5.73459 5 5.47689 5.12911 5.29493C5.17466 5.23072 5.23072 5.17466 5.29493 5.12911C5.47689 5 5.73459 5 6.25 5C6.76541 5 7.02311 5 7.20507 5.12911C7.26928 5.17466 7.32534 5.23072 7.37089 5.29493C7.5 5.47689 7.5 5.73459 7.5 6.25C7.5 6.76541 7.5 7.02311 7.37089 7.20507C7.32534 7.26928 7.26928 7.32534 7.20507 7.37089C7.02311 7.5 6.76541 7.5 6.25 7.5C5.73459 7.5 5.47689 7.5 5.29493 7.37089C5.23072 7.32534 5.17466 7.26928 5.12911 7.20507C5 7.02311 5 6.76541 5 6.25Z" fill="white"/>
      <path d="M5 17.75C5 17.2346 5 16.9769 5.12911 16.7949C5.17466 16.7307 5.23072 16.6747 5.29493 16.6291C5.47689 16.5 5.73459 16.5 6.25 16.5C6.76541 16.5 7.02311 16.5 7.20507 16.6291C7.26928 16.6747 7.32534 16.7307 7.37089 16.7949C7.5 16.9769 7.5 17.2346 7.5 17.75C7.5 18.2654 7.5 18.5231 7.37089 18.7051C7.32534 18.7693 7.26928 18.8253 7.20507 18.8709C7.02311 19 6.76541 19 6.25 19C5.73459 19 5.47689 19 5.29493 18.8709C5.23072 18.8253 5.17466 18.7693 5.12911 18.7051C5 18.5231 5 18.2654 5 17.75Z" fill="white"/>
      <path d="M16 17.75C16 17.0478 16 16.6967 16.1685 16.4444C16.2415 16.3352 16.3352 16.2415 16.4444 16.1685C16.6967 16 17.0478 16 17.75 16C18.4522 16 18.8033 16 19.0556 16.1685C19.1648 16.2415 19.2585 16.3352 19.3315 16.4444C19.5 16.6967 19.5 17.0478 19.5 17.75C19.5 18.4522 19.5 18.8033 19.3315 19.0556C19.2585 19.1648 19.1648 19.2585 19.0556 19.3315C18.8033 19.5 18.4522 19.5 17.75 19.5C17.0478 19.5 16.6967 19.5 16.4444 19.3315C16.3352 19.2585 16.2415 19.1648 16.1685 19.0556C16 18.8033 16 18.4522 16 17.75Z" fill="white"/>
    </svg>
  );
}

// Малиновый значок Raspberry Pi — показывается рядом с логотипом когда подключены к плате
function RaspberryIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="2 0 30 32" fill="rgba(255,255,255,0.95)" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <path d="M13.8,6.4c-1.4-1.1-2.9-1.9-4.6-2.5c1.5,0.9,3,1.7,4.2,2.9c-0.1,1.1-1.5,1.8-3.1,1.7c-0.1-0.1,0.1-0.1,0.1-0.3C10,8.1,9.5,8.2,9.2,8c0-0.1,0.2-0.1,0.1-0.2C9,7.6,8.6,7.5,8.3,7.3c0-0.1,0.2-0.1,0.3-0.2c-0.3-0.2-0.7-0.3-1-0.6c0.1-0.1,0.2,0,0.3-0.2C7.6,6.1,7.3,5.9,7.1,5.6c0.1-0.1,0.2,0,0.3-0.1C7.3,5.2,6.9,5,6.8,4.7c0.2,0,0.3,0.1,0.5-0.1C7.1,4.3,6.7,4.2,6.6,3.8c0.1-0.1,0.3,0,0.4-0.1c0-0.3-0.2-0.5-0.3-0.8c0.3-0.1,0.7,0,1-0.1c0-0.1-0.1-0.2-0.1-0.3c0.4-0.2,0.8,0,1.2,0.1c0.1-0.2-0.1-0.2,0-0.4c0.3,0,0.6,0.2,1,0.2C9.9,2.2,9.6,2.2,9.6,2c0.4,0,0.7,0.2,1,0.4c0.1-0.1,0-0.2,0.1-0.4c0.3,0.1,0.5,0.3,0.8,0.5c0.2,0,0.1-0.2,0.2-0.3c0.3,0.1,0.5,0.4,0.7,0.5c0.2,0,0.1-0.2,0.2-0.3c0.3,0.2,0.5,0.5,0.7,0.7c0.2,0,0.1-0.2,0.3-0.2c0.6,0.7,1.2,1.5,1.1,2.5C14.7,5.9,14.3,6.2,13.8,6.4z"/>
      <path d="M23.5,7.1c0.1,0.1,0.2,0.1,0.3,0.1c-0.3,0.3-0.7,0.3-1.1,0.5c0,0.1,0.1,0.1,0.1,0.2c-0.3,0.2-0.8,0.1-1.1,0.2c-0.1,0.1,0.1,0.2,0,0.3c-0.4,0.1-0.8,0-1.3-0.1c-0.9-0.2-1.6-0.6-1.9-1.5c1.2-1.3,2.7-2.1,4.2-2.9c-1.7,0.6-3.2,1.4-4.6,2.4c-0.6-0.2-0.9-0.7-0.9-1.3c0-0.7,0.6-1.8,1.2-2.3l0.2,0.3c0.3-0.2,0.5-0.6,0.8-0.7c0.1,0.1,0,0.3,0.2,0.3c0.2-0.1,0.4-0.4,0.7-0.5c0.1,0.1,0,0.2,0.2,0.3C20.8,2.4,21,2.1,21.4,2c0,0.1-0.1,0.2,0,0.4C21.7,2.2,22,2,22.4,2c0,0.1-0.2,0.2-0.1,0.4c0.3,0,0.6-0.2,1-0.2c0,0.1-0.1,0.2,0,0.4c0.4-0.1,0.8-0.2,1.2-0.1c0,0.1-0.1,0.2-0.1,0.3c0.3,0.1,0.7,0,1,0.1C25.3,3.2,25,3.4,25,3.7c0.1,0.1,0.3,0,0.4,0.1c-0.1,0.4-0.5,0.5-0.6,0.8c0.1,0.2,0.3,0,0.4,0.1c-0.1,0.3-0.5,0.5-0.7,0.8c0.1,0.2,0.2,0.1,0.3,0.1c-0.2,0.3-0.5,0.4-0.7,0.7c0.1,0.1,0.2,0.1,0.3,0.2C24.2,6.8,23.8,6.9,23.5,7.1z"/>
      <path d="M15.4,16c0,1.8-1.4,3.6-3.2,4c-1.8,0.4-3.4-0.9-3.5-2.7c-0.1-1.8,1.2-3.6,2.9-4C13.7,12.7,15.4,14,15.4,16z"/>
      <path d="M23.4,16.9c0,2.1-1.8,3.4-3.8,2.8c-1.8-0.6-3.1-2.5-2.8-4.4c0.3-1.8,2.1-2.9,3.9-2.2C22.3,13.7,23.4,15.3,23.4,16.9z"/>
      <path d="M16.1,19.4c1,0,2,0.4,2.7,1.2c1.2,1.3,1.1,3.2-0.2,4.3c-1.3,1.1-3.4,1.2-4.7,0.1c-1-0.8-1.4-1.8-1.2-3.1c0.3-1.3,1.2-2,2.4-2.4C15.4,19.5,15.7,19.4,16.1,19.4z"/>
      <path d="M19.8,25.3c0.1-1,0.5-2,1.3-2.9c0.5-0.5,1-1,1.5-1.4c0.3-0.2,0.6-0.3,0.9-0.4c0.6-0.1,1.1,0.1,1.3,0.7c0.4,1,0.5,2,0,3c-0.6,1.4-1.7,2.3-3.2,2.6c-0.1,0-0.3,0-0.5,0C20.2,27,19.8,26.6,19.8,25.3z"/>
      <path d="M6.9,22.7c0,0,0-0.2,0-0.3c0.1-1.1,0.7-1.5,1.8-1.2c1.7,0.5,3.3,2.5,3.4,4.3c0,1.1-0.5,1.6-1.6,1.4c-1.5-0.2-2.5-1-3.1-2.3C7,24,6.9,23.4,6.9,22.7z"/>
      <path d="M16.2,12.8c-0.8,0-1.6-0.1-2.3-0.5c-1.3-0.7-1.3-1.6-0.2-2.4c1.5-1.1,3.5-1,4.9,0.2c0.1,0.1,0.2,0.2,0.3,0.3c0.5,0.6,0.4,1.2-0.2,1.7c-0.5,0.4-1.1,0.5-1.7,0.6C16.7,12.8,16.4,12.8,16.2,12.8z"/>
      <path d="M16,30c-1.2,0-2.2-0.5-3.1-1.4c-0.4-0.4-0.4-0.8,0.1-1.1c0.7-0.4,1.4-0.6,2.2-0.7c1-0.1,2-0.1,3,0.2c0.2,0.1,0.5,0.2,0.7,0.3c0.6,0.3,0.7,0.6,0.2,1.2C18.3,29.5,17.3,30,16,30z"/>
      <path d="M7.8,16.8c0,1.1-0.2,2.1-0.6,3.1c-0.1,0.3-0.2,0.5-0.4,0.7C6.5,21,6.3,21,6,20.7c-1.4-1.4-1.2-4.1,0.5-5.3c0.6-0.5,1-0.4,1.2,0.4C7.7,16.1,7.8,16.5,7.8,16.8z"/>
      <path d="M26.9,18.3c0,0.8-0.3,1.7-0.9,2.4c-0.3,0.3-0.5,0.3-0.8,0c-0.3-0.4-0.5-0.9-0.6-1.4c-0.3-1-0.4-2.1-0.3-3.2c0-0.2,0.1-0.5,0.2-0.7c0.2-0.4,0.4-0.5,0.8-0.2C26.3,15.8,26.9,16.9,26.9,18.3z"/>
    </svg>
  );
}

export const NavbarNoteLib = () => {
  const { data: session, status } = useSession();
  const { isLocal } = useLocalServer();
  const [boardOffline, setBoardOffline] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem("board-offline-v1") === "1"
  );

  // Следим за изменением состояния платы через sessionStorage
  useEffect(() => {
    if (!isLocal) return;
    const check = () => setBoardOffline(sessionStorage.getItem("board-offline-v1") === "1");
    const t = setInterval(check, 3000);
    return () => clearInterval(t);
  }, [isLocal]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stackName, setStackName] = useState("");
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isExitStackModalOpen, setIsExitStackModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
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
            <div className="flex items-center gap-1.5">
              <CamertonLogo className="h-10 w-10 sm:h-12 sm:w-12 -translate-y-1" />
              <p className="hidden sm:flex font-navbarBrand text-inherit text-sm sm:text-base">
                Нотная библиотека
              </p>
              {/* Малиновый значок RPi — только при подключении к плате */}
              {isLocal && !boardOffline && (
                <span
                  title="Подключено к Raspberry Pi"
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    background: "radial-gradient(circle at 40% 40%, #e8457a, #9e1239)",
                    boxShadow: "0 0 0 2px rgba(232,69,122,0.2), 0 0 8px rgba(232,69,122,0.35)",
                  }}
                >
                  <RaspberryIcon size={15} />
                </span>
              )}
            </div>
          </div>
        </NavbarContent>

        {/* Десктопная версия кнопок */}
        <NavbarContent
          className="hidden md:flex basis-1/5 md:basis-full"
          justify="end"
        >
          <NavbarItem className="flex gap-4">
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
              onPress={() => setIsQRModalOpen(true)}
              radius="full"
              isIconOnly
              className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
              aria-label="QR вход"
            >
              <QRIcon />
            </Button>
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
        <NavbarContent className="flex md:hidden" justify="end">
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

                {/* Кнопка QR вход */}
                <Button
                  onPress={() => { setIsQRModalOpen(true); setIsOpen(false); }}
                  radius="full"
                  className="w-full bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-md justify-start gap-1.5 input-header px-4"
                  startContent={<QRIcon />}
                >
                  QR вход
                </Button>

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
      
      <QRModal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} />
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
                  Вы действительно хотите выйти из программы и перейти на главную
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
