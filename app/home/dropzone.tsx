"use client";

import { useEffect, useState, useRef } from "react";
import Dropzone from "dropzone";
import "dropzone/dist/dropzone.css";
import { Button, Card } from "@heroui/react";

export default function MyDropzone({
  onFileSelect,
  onPreview,
}: {
  onFileSelect?: (file: File | null, id?: string | null) => void;
  onPreview?: () => void;
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const dzRef = useRef<Dropzone | null>(null);

  useEffect(() => {
    Dropzone.autoDiscover = false;

    const dz = new Dropzone("#my-dropzone", {
      url: "http://localhost:4000/api/upload",
      maxFilesize: 5,
      acceptedFiles: "image/*,application/pdf",
      paramName: "file",
      autoProcessQueue: false,
      dictDefaultMessage: "",
      clickable: ".dropzone-clickable",
      previewsContainer: false,
      createImageThumbnails: false,
    });

    dz.on("addedfile", (file) => {
      console.log("Файл добавлен в Dropzone:", file.name);
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    });

    dz.on("success", (file, response) => {
      const fileId = response?.id || null;
      if (onFileSelect) onFileSelect(file, fileId);
    });

    dz.on("dragenter", () => setIsDragActive(true));
    dz.on("dragleave", () => setIsDragActive(false));
    dz.on("drop", () => setIsDragActive(false));

    dzRef.current = dz;

    return () => dz.destroy();
  }, [onFileSelect]);

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (dzRef.current && selectedFile) {
      dzRef.current.removeFile(selectedFile);
      setSelectedFile(null);
      if (onFileSelect) onFileSelect(null, null);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📄";
    if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return "🖼️";
    return "📎";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  console.log("MyDropzone render - selectedFile:", selectedFile?.name);
  console.log("MyDropzone render - onPreview:", !!onPreview);

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card className="w-full h-48 flex items-center justify-center p-6">
        <form
          id="my-dropzone"
          className="dropzone w-full h-full flex items-center justify-center"
          style={{ border: "none", position: "relative" }}
        >
          <div className="dropzone-clickable w-full h-full flex items-center justify-center cursor-pointer">
            {!selectedFile ? (
              <div className="text-center font-medium text-default-500">
                Перетащите файлы сюда
                <br />
                или кликните для выбора
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full">
                {/* Файл с крестиком */}
                <div className="relative">
                  <div className="px-4 py-3 bg-gradient-to-r from-[#BD9673]/10 to-[#7D5E42]/10 rounded-lg border border-[#BD9673]/30 flex items-center space-x-3">
                    <div className="text-xl">
                      {getFileIcon(selectedFile.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium text-gray-800 truncate text-sm"
                        title={selectedFile.name}
                      >
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>

                  {/* Крестик для удаления */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(e);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow"
                    aria-label="Удалить файл"
                  >
                    <span className="text-xs font-bold">×</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </Card>

      {/* Кнопка предпросмотра */}
      {selectedFile && onPreview && (
        <div>
          <Button
            onPress={onPreview}
            className="w-full py-3 bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white text-sm rounded-lg flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity shadow-md"
          >
            <span className="font-medium">Предпросмотр файла</span>
          </Button>
          {/* Отладочная информация */}
          <div className="text-xs text-gray-400 mt-1 text-center">
            Файл: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </div>
        </div>
      )}

      {/* Отладочная информация когда кнопка не показывается */}
      {!selectedFile && (
        <div className="text-xs text-gray-400 text-center">
          Ожидание загрузки файла...
        </div>
      )}
      {selectedFile && !onPreview && (
        <div className="text-xs text-red-400 text-center">
          Файл загружен, но onPreview не передан
        </div>
      )}
    </div>
  );
}
