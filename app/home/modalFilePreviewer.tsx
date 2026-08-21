// modalFilePreviewer.tsx
"use client";
import { Modal, ModalContent, ModalBody } from "@heroui/react";
import { useState, useEffect } from "react";
import { Viewer } from "../stack/[id]/components/Viewer";

interface ModalFilePreviewerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFile: File | null;
}

export default function ModalFilePreviewer({
  isOpen,
  onClose,
  selectedFile,
}: ModalFilePreviewerProps) {
  const [pageNum, setPageNum] = useState<number | null>(1);

  useEffect(() => {
    if (!isOpen) {
      setPageNum(1);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="center"
      // На телефоне окно шло по центру, а не под самой шапкой: прижатие к
      // верху и сдвиг вверх оставлены только широким экранам, где так и задумано
      className="mt-0 md:mt-20"
      size="4xl"
      classNames={{
        wrapper: "items-center md:!items-start",
        // Поля по бокам на телефоне: без них окно упиралось в края экрана и
        // значок закрытия в углу оказывался срезанным
        base: "mx-2 md:mx-0 md:-translate-y-10",
        closeButton:
          "top-2 right-2 md:top-3 md:right-3 !w-9 !h-9 [&>svg]:w-5 [&>svg]:h-5 z-20",
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalBody className="mb-4">
              {selectedFile ? (
                <Viewer fileUrl={selectedFile} />
              ) : (
                <div className="text-center">Файл не выбран</div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
