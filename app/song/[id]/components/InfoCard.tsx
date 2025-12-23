"use client";
import MyDropzone from "@/app/home/dropzone";
import ModalFilePreviewer from "@/app/home/modalFilePreviewer";
import Separator from "@/components/Separator";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { Input } from "@heroui/input";
import { useState } from "react";
import { SongContextProvider } from "../SongContextProvider";
import { getSongById } from "@/lib/utils";

export default async function InfoCard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [isEdit, setIsEdit] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const { id } = await params;
  const song = await getSongById(id);

  const handleEdit = () => {
    setIsEdit(!isEdit);
  };

  const handlePreview = () => {
    if (selectedFile) {
      setIsPreviewModalOpen(true);
    }
  };

  const handleFileSelect = (file: File | null, id?: string | null) => {
    console.log("Файл выбран:", file?.name, "ID:", id);
    setSelectedFile(file);
  };

  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
  };

  return (
    <SongContextProvider songResponse={song}>
      <Card className="mt-8 p-3">
        <span className="flex items-center gap-42">
          <p className="card-header text-left pl-5">Информация о партитуре:</p>
          <Button
            onPress={handleEdit}
            isIconOnly
            className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full ml-10"
          >
            ред
          </Button>
        </span>
        {isEdit ? (
          <span className="pl-5">
            <span className="flex items-center  gap-2">
              <Separator />
              <p>Название: Вера вечна</p>
            </span>
            <span className="flex items-center  gap-2">
              <Separator />
              <p>Автор музыки: А. Молев</p>
            </span>
            <span className="flex items-center gap-2">
              <Separator />
              <p>Автор слов: -</p>
            </span>
            <span className="flex items-center  gap-2">
              <Separator />
              <p>Автор аранжировки: -</p>
            </span>
            <span className="flex items-center gap-2">
              <Separator />
              <p>Категория: Духовные канты</p>
            </span>
          </span>
        ) : (
          <span className="pl-5">
            <span className="flex items-center  gap-2">
              <Separator />
              <p>Название:</p>
              <Input></Input>
            </span>
            <span className="flex items-center  gap-2">
              <Separator />
              <p>Автор музыки:</p>
              <Input></Input>
            </span>
            <span className="flex items-center gap-2">
              <Separator />
              <p>Автор слов:</p>
              <Input></Input>
            </span>
            <span className="flex items-center  gap-2">
              <Separator />
              <p>Автор аранжировки:</p>
              <Input></Input>
            </span>
            <span className="flex items-center gap-2">
              <Separator />
              <p>Категория:</p>
              <Input></Input>
            </span>
            <div
              style={{
                textAlign: "center",
                justifyContent: "center",
                marginTop: "14px",
                marginBottom: "14px",
              }}
              className="card-header"
            >
              Заменить файл
            </div>
            <MyDropzone
              onFileSelect={handleFileSelect}
              onPreview={handlePreview}
            />
          </span>
        )}
      </Card>
      <ModalFilePreviewer
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        selectedFile={selectedFile}
      />
    </SongContextProvider>
  );
}
