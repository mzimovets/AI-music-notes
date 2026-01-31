"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";
import { Button } from "@heroui/button";

import { Link } from "@heroui/link";

import ModalAddScore from "@/app/home/modalAddScore";
import StackNameModal from "@/components/modalAddStack";

import { useRouter } from "next/navigation";
import { CamertonLogo } from "./camertonSvg";
import { useState } from "react";
import React from "react";
import { StackIcon } from "./icons/StackIcon";

export const Navbar = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stackName, setStackName] = useState("");

  const router = useRouter();

  const handleOpenStack = () => setIsModalOpen(true);

  const handleConfirmStack = () => {
    if (stackName.trim() === "") return;
    setIsModalOpen(false);
    router.push("/stack");
  };

  return (
    <>
      <HeroUINavbar
        maxWidth="xl"
        position="sticky"
        className="bg-navbar"
        style={{ borderBottom: "1px solid #7D5E42" }}
      >
        <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
          <Link href={"/"} style={{ display: "inline" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <CamertonLogo className="h-12 w-12 -translate-y-1" />
              <p className="font-navbarBrand text-inherit">Нотная библиотека</p>
            </div>
          </Link>
        </NavbarContent>

        <NavbarContent
          className="hidden sm:flex basis-1/5 sm:basis-full"
          justify="end"
        >
          <NavbarItem className="hidden md:flex gap-4">
            <ModalAddScore />
            <Button
              onPress={handleOpenStack}
              radius="full"
              isIconOnly
              className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full shadow-md"
            >
              <StackIcon color="white" />
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
    </>
  );
};
