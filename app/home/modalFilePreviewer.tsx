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
      className="mt-20"
      size="4xl"
      classNames={{
        wrapper: "!items-start",
        base: "-translate-y-10",
        closeButton: "top-3 right-3 !w-9 !h-9 [&>svg]:w-5 [&>svg]:h-5",
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
