"use client";
import { useState } from "react";
import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { button as buttonStyles } from "@heroui/theme";
import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
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
import ModalFilePreviewer from "./modalFilePreviewer";
import Pdfjs from "./pdfjs";

export default function Home() {
  const preview = useDisclosure();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [pageNum, setPageNum] = useState<number | null>(1);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        {/*  */}
        <ModalAddScore onOpenPreview={preview.onOpen} />
        <ModalFilePreviewer
          isOpen={preview.isOpen}
          onOpenChange={preview.onOpenChange}
        />
        {/*  */}
        <span className={title()}>Make&nbsp;</span>
        <span className={title({ color: "violet" })}>beautiful&nbsp;</span>
        <br />
        <span className={title()}>
          websites regardless of your design experience.
        </span>
        <div className={subtitle({ class: "mt-4" })}>
          Beautiful, fast and modern React UI library.
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          isExternal
          className={buttonStyles({
            color: "primary",
            radius: "full",
            variant: "shadow",
          })}
          href={siteConfig.links.docs}
        >
          Documentation
        </Link>
        <Link
          isExternal
          className={buttonStyles({ variant: "bordered", radius: "full" })}
          href={siteConfig.links.github}
        >
          <GithubIcon size={20} />
          GitHub
        </Link>
      </div>

      <div className="mt-8">
        <Snippet hideCopyButton hideSymbol variant="bordered">
          <span>
            Get started by editing <Code color="primary">app/page.tsx</Code>
          </span>
        </Snippet>
      </div>
      <div className="flex gap-5">
        {/* Модалка */}
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
          <ModalContent className="!mt-2">
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  Modal Title
                </ModalHeader>
                <ModalBody>
                  <Card
                    className={`w-132 h-180 flex items-center justify-center p-6 transition-colors duration-200`}
                  >
                    <Pdfjs
                      fileUrl={selectedFile}
                      setPdfDoc={setPdfDoc}
                      pageNum={pageNum || 1}
                    />
                  </Card>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
                    Close
                  </Button>
                  <Button color="primary" onPress={onClose}>
                    Action
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
        {/* Модалка */}
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
