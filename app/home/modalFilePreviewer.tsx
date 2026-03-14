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
  const [, setPageNum] = useState<number | null>(1);

  useEffect(() => {
    if (!isOpen) {
      setPageNum(1);
    }
  }, [isOpen]);

  return (
    <Modal
      classNames={{
        wrapper: "!items-start",
        base: "-translate-y-10",
      }}
      isOpen={isOpen}
      placement="center"
      size="xl"
      onOpenChange={onClose}
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
