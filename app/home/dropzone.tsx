"use client";

import { useEffect, useState, useRef } from "react";
import Dropzone from "dropzone";
import "dropzone/dist/dropzone.css";
import { Card } from "@heroui/react";

export default function MyDropzone({
  onFileSelect,
}: {
  onFileSelect?: (file: File | null, id?: string | null) => void;
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // <- сюда
  const dzRef = useRef<Dropzone | null>(null);

  useEffect(() => {
    Dropzone.autoDiscover = false;

    // TO DO: Тут не нужно сразу отправлять на сервер. нужно просто сохранить в хранилке (hook-form/rtk/state+props)
    // и потом отправлять сразу файл и поля Автор, название как multipart/form-data
    const dz = new Dropzone("#my-dropzone", {
      // url: "http://localhost:4000/api/upload",
      maxFilesize: 5,
      acceptedFiles: "image/*,application/pdf",
      paramName: "file",
      autoProcessQueue: true,
      dictDefaultMessage: "",
    });

    dz.on("addedfile", (file) => {
      console.log("Файл добавлен:", file.name);
      setSelectedFile(file); // <- здесь
      if (onFileSelect) onFileSelect(file); // <- если хочешь сразу передавать наружу
    });

    dz.on("success", (file, response) => {
      console.log("Файл успешно загружен:", response);
      const fileId = response?.id || null;
      if (onFileSelect) onFileSelect(file, fileId);
    });

    dz.on("dragenter", () => setIsDragActive(true));
    dz.on("dragleave", () => setIsDragActive(false));
    dz.on("drop", () => setIsDragActive(false));

    dzRef.current = dz;

    return () => dz.destroy();
  }, [onFileSelect]);

  const handleRemoveFile = () => {
    if (dzRef.current && selectedFile) {
      dzRef.current.removeFile(selectedFile);
      setSelectedFile(null);
      if (onFileSelect) onFileSelect(null, null);
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
        <div className="text-center font-medium text-default-500">
          Перетащите файлы сюда или кликните для выбора
        </div>
        {selectedFile && (
          <div className="absolute top-2 right-2 flex items-center space-x-2 bg-white rounded px-2 py-1 shadow">
            <span className="text-sm">{selectedFile.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemoveFile();
              }}
              className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
              aria-label="Удалить файл"
            >
              ×
            </button>
          </div>
        )}
      </form>
    </Card>
  );
}
