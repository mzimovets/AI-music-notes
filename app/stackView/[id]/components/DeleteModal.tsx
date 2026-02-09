import { removeStack } from "@/actions/actions";
import ModalFilePreviewer from "@/app/home/modalFilePreviewer";
import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export const DeleteModal = (props) => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { isDeleteModalOpen, setIsDeleteModalOpen } = props;
  const [isDeleting, setIsDeleting] = useState(false);
  const { stackResponse } = useStackContext();

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await removeStack(params.id);
      if (response) {
        router.push(`/`);
        // router.refresh();
      } else {
        setIsDeleting(false);
        console.error("Ошибка при удалении стопки");
      }
    } catch (error) {
      console.error("Ошибка при удалении стопки:", error);
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isDeleteModalOpen}
      onOpenChange={setIsDeleteModalOpen}
      placement="center"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-gray-900">
                Удалить стопку
              </h3>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Вы уверены, что хотите удалить стопку
                  <br />
                  <span className="font-semibold text-gray-900 ml-1">
                    "{stackResponse.doc?.name}"
                  </span>
                  ?
                </p>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700 font-medium">
                    ⚠️ Это действие невозможно отменить
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} disabled={isDeleting}>
                Отмена
              </Button>
              <Button
                onPress={handleConfirmDelete}
                className="bg-gradient-to-r from-red-400 to-red-500 text-white"
                isLoading={isDeleting}
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
