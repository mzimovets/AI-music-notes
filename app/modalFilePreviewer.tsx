// modalFilePreviewer.tsx
"use client";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import Pdfjs from "./pdfjs";
import { Card } from "@heroui/react";
import { ButtonGroup, Button } from "@heroui/button";
import { useState, useEffect } from "react";

interface ModalFilePreviewerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFile: File | null; // <- добавляем проп
}

export default function ModalFilePreviewer({
  isOpen,
  onClose,
  selectedFile,
}: ModalFilePreviewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number | null>(1);

  useEffect(() => {
    if (!isOpen) {
      setPageNum(1);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} placement="top" size="xl">
      <ModalContent
        style={{
          marginTop: "20px", // уменьшаем отступ сверху
        }}
      >
        {() => (
          <>
            <ModalHeader className="text-center">Предпросмотр</ModalHeader>
            <ModalBody style={{ marginBottom: "14px" }}>
              <Card
                radius="lg"
                className="fixed left-66 top-1/2 -translate-y-1/2 z-50 w-30 h-50 flex items-center justify-center"
              >
                <Button
                  color="primary"
                  variant="shadow"
                  radius="full"
                  //   className="w-12 h-12"
                  onClick={() =>
                    setPageNum((prev) =>
                      pdfDoc && prev !== null && prev < pdfDoc.numPages
                        ? prev + 1
                        : prev
                    )
                  }
                  disabled={
                    pdfDoc
                      ? pageNum === null
                        ? true
                        : pageNum >= pdfDoc.numPages
                      : true
                  }
                >
                  +
                </Button>
                <span style={{ display: "flex" }}>
                  <input
                    type="number"
                    min={1}
                    value={pageNum === null ? "" : pageNum}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setPageNum(null); // временно пустое значение
                        return;
                      }
                      const num = Number(val);
                      if (
                        !isNaN(num) &&
                        num >= 1 &&
                        (!pdfDoc || num <= pdfDoc.numPages)
                      ) {
                        setPageNum(num);
                      }
                    }}
                    onBlur={() => {
                      if (!pageNum || pageNum < 1) {
                        setPageNum(1);
                      } else if (pdfDoc && pageNum > pdfDoc.numPages) {
                        setPageNum(pdfDoc.numPages);
                      }
                    }}
                    style={{
                      width: "40px",
                      textAlign: "center",
                      margin: "0 8px",
                    }}
                  />
                  <span>/ {pdfDoc?.numPages || 0}</span>
                </span>
                <Button
                  color="primary"
                  variant="shadow"
                  //   className="w-12 h-12"
                  radius="full"
                  onClick={() =>
                    setPageNum((prev) =>
                      prev !== null && prev > 1 ? prev - 1 : prev
                    )
                  }
                  disabled={pageNum === null ? true : pageNum <= 1}
                >
                  -
                </Button>
              </Card>
              {selectedFile ? (
                <>
                  <Card
                    className={`w-132 h-180 flex items-center justify-center p-6 transition-colors duration-200`}
                  >
                    <Pdfjs
                      fileUrl={selectedFile}
                      setPdfDoc={setPdfDoc}
                      pageNum={pageNum || 1}
                    />
                  </Card>
                  {/* Стандартные кнопки под pdf */}
                  {/* <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: 2,
                      gap: 10,
                    }}
                  >
                    <ButtonGroup>
                      <Button
                        onClick={() =>
                          setPageNum((prev) => (prev !== null && prev > 1 ? prev - 1 : prev))
                        }
                        disabled={pageNum === null ? true : pageNum <= 1}
                      >
                        Prev
                      </Button>
                      <span>
                        Page {pageNum || 1} / {pdfDoc?.numPages || 0}
                      </span>
                      <Button
                        onClick={() =>
                          setPageNum((prev) =>
                            pdfDoc && prev !== null && prev < pdfDoc.numPages ? prev + 1 : prev
                          )
                        }
                        disabled={pdfDoc ? (pageNum === null ? true : pageNum >= pdfDoc.numPages) : true}
                      >
                        Next
                      </Button>
                    </ButtonGroup>
                  </div> */}
                </>
              ) : (
                <div className="text-center">Файл не выбран</div>
              )}
            </ModalBody>
            {/* <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Закрыть
              </Button>
            </ModalFooter> */}
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
