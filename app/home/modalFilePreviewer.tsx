// modalFilePreviewer.tsx
"use client";
import { Modal, ModalContent, ModalBody } from "@heroui/react";
import { useState, useEffect } from "react";
import { DocViewer } from "../song/[id]/components/DocViewer";

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
    <Modal isOpen={isOpen} onOpenChange={onClose} placement="top" size="xl">
      <ModalContent
        style={{
          marginTop: "20px",
        }}
      >
        {() => (
          <>
            <ModalBody>
              {selectedFile ? (
                <>
                  <DocViewer fileUrl={selectedFile} />
                </>
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
