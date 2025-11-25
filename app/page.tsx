"use client";
import { useState, useRef } from "react";
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

import {
  DownloadOutlined,
  PrinterOutlined,
  EyeOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";

import MyDropzone from "./dropzone";
import ModalAddScore from "./modalAddScore";
import ModalFilePreviewer from "./modalFilePreviewer";
import Pdfjs from "./pdfjs";
import SongMenu from "./songMenu";

export default function Home() {
  const preview = useDisclosure();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [pageNum, setPageNum] = useState<number | null>(1);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const iframeRef = useRef(null);

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.src = `/pdf.pdf`;
      iframeRef.current.onload = () => {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      };
    }
  };

  const handleShare = async () => {
    const pdfUrl = `/pdf.pdf`;
    const pdfTitle = "На реках Вавилонских";
    try {
      if (navigator.share) {
        await navigator.share({
          title: pdfTitle,
          url: pdfUrl,
        });
      }
    } catch (error) {
      console.error("Ошибка при отправке партитуры:", error);
    }
  };

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
        <SongMenu />
        <Snippet hideCopyButton hideSymbol variant="bordered">
          <span>
            Get started by editing <Code color="primary">app/page.tsx</Code>
          </span>
        </Snippet>
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
      </div>
      {/* Модалка */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl">
        <ModalContent
          style={{
            position: "absolute",
            top: "2%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Название
              </ModalHeader>
              <ModalBody className="flex flex-row items-start gap-4">
                <Card
                  className={`w-132 h-180 flex items-center justify-center p-6 transition-colors duration-200`}
                >
                  <Pdfjs
                    fileUrl="/pdf.pdf"
                    setPdfDoc={setPdfDoc}
                    pageNum={pageNum || 1}
                  />
                </Card>
                <span className="gap-4">
                  <h1>Название</h1>
                  <h1>Автор</h1>
                  <Button
                    isIconOnly
                    color="primary"
                    className="w-10 h-10"
                    radius="full"
                  >
                    <a
                      href={`/pdf.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <EyeOutlined style={{ fontSize: "24px" }} />{" "}
                    </a>
                  </Button>
                  <Button
                    isIconOnly
                    color="secondary"
                    radius="full"
                    className="w-10 h-10"
                  >
                    <a href={`/pdf.pdf`} download>
                      <DownloadOutlined style={{ fontSize: "24px" }} />
                    </a>
                  </Button>
                  <div style={{ display: "none" }}>
                    <iframe
                      ref={iframeRef}
                      style={{ display: "none" }}
                      title="PDF для печати"
                    />
                  </div>
                  <Button
                    isIconOnly
                    color="secondary"
                    radius="full"
                    className="w-10 h-10"
                    onPress={handlePrint}
                  >
                    <PrinterOutlined style={{ fontSize: "24px" }} />
                  </Button>
                  <Button
                    isIconOnly
                    color="secondary"
                    radius="full"
                    className="w-10 h-10"
                    onPress={handleShare}
                  >
                    <ShareAltOutlined style={{ fontSize: "24px" }} />
                  </Button>
                </span>
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
    </section>
  );
}
