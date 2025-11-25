"use client";

import { useEffect, useState, useRef } from "react";
import Dropzone from "dropzone";
import "dropzone/dist/dropzone.css";
import { Card } from "@heroui/react";
import Image from "next/image";

export default function MyDropzone({
  onFileSelect,
}: {
  onFileSelect?: (file: File | null, id?: string | null) => void;
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const dzRef = useRef<Dropzone | null>(null);

  useEffect(() => {
    Dropzone.autoDiscover = false;

    const dz = new Dropzone("#my-dropzone", {
      url: "http://localhost:4000/api/upload",
      maxFilesize: 5,
      acceptedFiles: "image/*,application/pdf",
      paramName: "file",
      autoProcessQueue: true,
      dictDefaultMessage: "",
      previewsContainer: false,
    });

    dz.on("addedfile", (file) => {
      console.log("Файл добавлен:", file.name);
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    });

    dz.on("success", (file, response: any) => {
      console.log("Ответ сервера при загрузке:", response);
      const fileIdFromServer = response?.doc?._id || null;
      if (fileIdFromServer) {
        (file as any)._id = fileIdFromServer;
        setSelectedFile(file);
        setFileId(fileIdFromServer);
        if (onFileSelect) onFileSelect(file, fileIdFromServer);
      }
    });

    dz.on("dragenter", () => setIsDragActive(true));
    dz.on("dragleave", () => setIsDragActive(false));
    dz.on("drop", () => setIsDragActive(false));

    dzRef.current = dz;

    return () => dz.destroy();
  }, [onFileSelect]);

  const handleRemoveFile = async (file: File | null) => {
    if (!file) {
      console.warn("Файл не выбран для удаления");
      return;
    }
    const fileIdToDelete = (file as any)._id;
    if (!fileIdToDelete) {
      console.warn("Нет _id для удаления файла");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:4000/api/upload/${fileIdToDelete}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        console.error(
          "Ошибка при удалении файла с сервера:",
          response.statusText
        );
        return;
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        console.log("Файл удалён с сервера:", data);
      } catch {
        console.warn("Ответ сервера не JSON:", text);
      }

      if (dzRef.current) {
        dzRef.current.removeFile(file);
      }
      setSelectedFile(null);
      setFileId(null);
      if (onFileSelect) onFileSelect(null, null);
    } catch (err) {
      console.error("Ошибка при удалении файла с сервера:", err);
    }
  };

  return (
    <Card
      className={`w-full h-48 flex items-center justify-center p-6 transition-colors duration-200 ${
        isDragActive ? "bg-gray-100" : "bg-white"
      }`}
    >
      <form
        id="my-dropzone"
        className="dropzone w-full h-full flex items-center justify-center cursor-pointer"
        style={{ border: "none", position: "relative" }}
      >
        {!selectedFile && (
          <div className="text-center font-medium text-default-500">
            Перетащите файл сюда или нажмите для выбора
          </div>
        )}

        {selectedFile && (
          <div className="w-full flex flex-col items-center">
            <div className="relative w-30 h-24 bg-gray-100 rounded shadow flex items-center justify-center">
              <Image width={80} height={80} alt="pdf.png" src={"/pdf.png"} />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveFile(selectedFile);
                }}
                className="absolute -top-1 right-1 text-red-500 hover:text-red-700 font-bold text-2xl"
                aria-label="Удалить файл"
              >
                ×
              </button>
            </div>
            <div className="mt-2 text-center overflow-hidden text-ellipsis whitespace-nowrap">
              {selectedFile.name}
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}
