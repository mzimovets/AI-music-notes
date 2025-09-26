"use client";

import { useEffect, useState } from "react";
import Dropzone from "dropzone";
import "dropzone/dist/dropzone.css";
import { Card } from "@heroui/react";

export default function MyDropzone() {
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    Dropzone.autoDiscover = false;

    const dz = new Dropzone("#my-dropzone", {
      url: "/api/upload",
      maxFilesize: 5,
      acceptedFiles: "image/*,application/pdf",
      dictDefaultMessage: "",
    });

    dz.on("addedfile", (file) => {
      console.log("Файл добавлен:", file.name);
    });

    dz.on("dragenter", () => setIsDragActive(true));
    dz.on("dragleave", () => setIsDragActive(false));
    dz.on("drop", () => setIsDragActive(false));

    return () => dz.destroy();
  }, []);

  return (
    <Card
      className={`w-full h-48 flex items-center justify-center p-6 transition-colors duration-200 ${
        isDragActive ? "bg-gray-100" : "bg-white"
      }`}
    >
      <form
        id="my-dropzone"
        className="dropzone w-full h-full flex items-center justify-center cursor-pointer"
        style={{ border: "none" }}
      >
        <div className="text-center font-medium text-default-500">
          Перетащите файлы сюда или кликните для выбора
        </div>
      </form>
    </Card>
  );
}
