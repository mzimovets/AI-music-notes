import {
  Button,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { removeStack } from "@/actions/actions";
import { TrashBinIcon } from "@/app/stack/[id]/components/icons/TrashBinIcon";

export const DeleteModal = (props) => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { isDeleteModalOpen, setIsDeleteModalOpen } = props;
  const [isDeleting, setIsDeleting] = useState(false);
  // const { stackResponse } = useStackContext();

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await removeStack(params.id);

      if (response) {
        router.push(`/`);
        // router.refresh();
      } else {
        setIsDeleting(false);
      }
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{ backdrop: "bg-black/40" }}
      isOpen={isDeleteModalOpen}
      placement="center"
      onOpenChange={setIsDeleteModalOpen}
    >
      <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl">
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col items-center text-center gap-2 pt-6">
              <div className="w-16 h-16 text-white rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
                <div className="scale-140">
                  <TrashBinIcon />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                Удалить стопку?
              </h3>
              <p className="text-gray-600 text-base input-header max-w-xs">
                Несохранённые изменения будут потеряны
              </p>
            </ModalHeader>

            <ModalFooter className="flex justify-center gap-4 pb-6">
              <Button
                className="border-white/50 bg-white/40 backdrop-blur-md hover:bg-white/60 input-header"
                disabled={isDeleting}
                variant="bordered"
                onPress={onClose}
              >
                Отмена
              </Button>
              <Button
                className="bg-gradient-to-r from-red-400 to-red-500 text-white shadow-md hover:shadow-lg transition-all input-header"
                isLoading={isDeleting}
                onPress={handleConfirmDelete}
              >
                {isDeleting ? "Удаление..." : "Да, удалить"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
