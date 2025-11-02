"use client";
import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  Input,
  useDisclosure,
  Card,
} from "@heroui/react";

import MyDropzone from "./dropzone";
import ModalAddScore from "./modalAddScore";
import Pdfjs from "./pdfjs";

export default function Home() {
  const preview = useDisclosure();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        {/*  */}
        <ModalAddScore />
      </div>

      <div className="flex gap-5">
        <Card
          isPressable
          onPress={onOpen}
          className=" z-50 w-30 h-30 flex items-center justify-center"
        >
          Тут песня
        </Card>
        <Card className=" z-50 w-30 h-30 flex items-center justify-center">
          Тут песня
        </Card>
        <Card className=" z-50 w-30 h-30 flex items-center justify-center">
          Тут песня
        </Card>
        <Card className=" z-50 w-30 h-30 flex items-center justify-center">
          Тут песня
        </Card>
        <Card className=" z-50 w-30 h-30 flex items-center justify-center">
          Тут песня
        </Card>
        <Card className=" z-50 w-30 h-30 flex items-center justify-center">
          Тут песня
        </Card>
      </div>
    </section>
  );
}
