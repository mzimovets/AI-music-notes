// "use client";

// import { useEffect, useState, useRef } from "react";
// import Dropzone from "dropzone";
// import "dropzone/dist/dropzone.css";
// import { Button, Card } from "@heroui/react";

// export default function MyDropzone({
//   onFileSelect,
//   onPreview,
// }: {
//   onFileSelect?: (file: File | null, id?: string | null) => void;
//   onPreview?: () => void;
// }) {
//   const [isDragActive, setIsDragActive] = useState(false);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const dzRef = useRef<Dropzone | null>(null);

//   useEffect(() => {
//     Dropzone.autoDiscover = false;

//     const dz = new Dropzone("#my-dropzone", {
//       url: "http://localhost:4000/api/upload",
//       maxFilesize: 5,
//       acceptedFiles: "image/*,application/pdf",
//       paramName: "file",
//       autoProcessQueue: false,
//       dictDefaultMessage: "",
//       clickable: ".dropzone-clickable",
//       previewsContainer: false,
//       createImageThumbnails: false,
//     });

//     dz.on("addedfile", (file) => {
//       console.log("Файл добавлен в Dropzone:", file.name);
//       setSelectedFile(file);
//       if (onFileSelect) onFileSelect(file);
//     });

//     dz.on("success", (file, response) => {
//       const fileId = response?.id || null;
//       if (onFileSelect) onFileSelect(file, fileId);
//     });

//     dz.on("dragenter", () => setIsDragActive(true));
//     dz.on("dragleave", () => setIsDragActive(false));
//     dz.on("drop", () => setIsDragActive(false));

//     dzRef.current = dz;

//     return () => dz.destroy();
//   }, [onFileSelect]);

//   const handleRemoveFile = (e: React.MouseEvent) => {
//     e.preventDefault();
//     e.stopPropagation();

//     if (dzRef.current && selectedFile) {
//       dzRef.current.removeFile(selectedFile);
//       setSelectedFile(null);
//       if (onFileSelect) onFileSelect(null, null);
//     }
//   };

//   const getFileIcon = (fileName: string) => {
//     const ext = fileName.split(".").pop()?.toLowerCase();
//     if (ext === "pdf") return "📄";
//     if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return "🖼️";
//     return "📎";
//   };

//   const formatFileSize = (bytes: number) => {
//     if (bytes < 1024) return bytes + " B";
//     if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
//     return (bytes / (1024 * 1024)).toFixed(1) + " MB";
//   };

//   // Массив эмодзи для фона
//   const documentEmojis = [
//     "📄",
//     "📋",
//     "📑",
//     "📊",
//     "📈",
//     "📉",
//     "🗂️",
//     "🗄️",
//     "📁",
//     "📂",
//     "🗃️",
//     "📇",
//   ];

//   return (
//     <div className="space-y-4">
//       {/* Dropzone */}
//       <Card className="w-full h-48 flex items-center justify-center p-6 relative overflow-hidden">
//         {/* Фон из эмодзи (только когда файл выбран) */}
//         {selectedFile && (
//           <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
//             <div className="grid grid-cols-4 grid-rows-3 gap-8 rotate-12 scale-125">
//               {documentEmojis.map((emoji, index) => (
//                 <div
//                   key={`emoji-${index}`}
//                   className="text-3xl flex items-center justify-center"
//                   style={{
//                     animation: `pulse ${2 + index * 0.2}s infinite alternate`,
//                   }}
//                 >
//                   {emoji}
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         <form
//           id="my-dropzone"
//           className="dropzone w-full h-full flex items-center justify-center relative z-10"
//           style={{ border: "none", position: "relative" }}
//         >
//           <div className="dropzone-clickable w-full h-full flex items-center justify-center cursor-pointer">
//             {!selectedFile ? (
//               <div className="text-center font-medium text-default-500 input-header">
//                 Перетащите файлы сюда
//                 <br />
//                 или кликните для выбора
//               </div>
//             ) : (
//               <div className="flex flex-col items-center justify-center w-full relative z-20">
//                 {/* Файл с крестиком */}
//                 <div className="relative backdrop-blur-sm bg-white/80 rounded-xl p-2">
//                   <div className="px-6 py-4 bg-gradient-to-r from-[#BD9673]/20 to-[#7D5E42]/20 rounded-lg border border-[#BD9673]/40 flex items-center space-x-4 shadow-lg">
//                     <div className="text-3xl bg-white/90 p-3 rounded-lg shadow">
//                       {getFileIcon(selectedFile.name)}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p
//                         className="font-semibold text-gray-900 truncate text-base"
//                         title={selectedFile.name}
//                       >
//                         {selectedFile.name}
//                       </p>
//                       <p className="text-sm text-gray-600 mt-1">
//                         {formatFileSize(selectedFile.size)}
//                       </p>
//                       <div className="flex items-center gap-2 mt-2">
//                         <div className="w-full bg-gray-200 rounded-full h-1.5">
//                           <div
//                             className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] h-1.5 rounded-full"
//                             style={{ width: "100%" }}
//                           />
//                         </div>
//                         <span className="text-xs text-gray-500">Загружено</span>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Крестик для удаления */}
//                   <button
//                     type="button"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       handleRemoveFile(e);
//                     }}
//                     onMouseDown={(e) => e.stopPropagation()}
//                     className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg hover:scale-110 z-30"
//                     aria-label="Удалить файл"
//                   >
//                     <span className="text-sm font-bold">×</span>
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </form>
//       </Card>

//       {/* Кнопка предпросмотра */}
//       {selectedFile && onPreview && (
//         <Button
//           onPress={onPreview}
//           className="w-full py-4 input-header bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white text-base font-medium rounded-xl flex items-center justify-center space-x-2 hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg"
//         >
//           <span className="font-semibold">Предпросмотр файла</span>
//         </Button>
//       )}

//       <style jsx>{`
//         @keyframes pulse {
//           0% {
//             opacity: 0.3;
//             transform: scale(0.95);
//           }
//           100% {
//             opacity: 0.7;
//             transform: scale(1.05);
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

"use client";

import { useEffect, useState, useRef, useId } from "react";
import Dropzone from "dropzone";
import "dropzone/dist/dropzone.css";
import { Button, Card } from "@heroui/react";

// Объявляем интерфейс ПЕРЕД функцией компонента
interface MyDropzoneProps {
  onFileSelect?: (file: File | null, id?: string | null) => void;
  onPreview?: () => void;
  hasError?: boolean;
  currentFile?: {
    name: string;
    size: number;
    id?: string;
  };
}

export default function MyDropzone({
  onFileSelect,
  onPreview,
  hasError = false,
  currentFile,
}: MyDropzoneProps) {
  // ← исправляем параметры
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const dzRef = useRef<Dropzone | null>(null);
  const dropzoneInitialized = useRef(false);
  const uniqueId = useId();
  const dropzoneId = `my-dropzone-${uniqueId.replace(/:/g, "-")}`;

  useEffect(() => {
    if (currentFile && currentFile?.id && !selectedFile) {
      // Создаем "фейковый" File объект для отображения
      const fakeFile = new File([], currentFile.name, {
        type: "application/pdf",
        lastModified: Date.now(),
      });

      // Устанавливаем размер через Object.defineProperty
      Object.defineProperty(fakeFile, "size", {
        value: currentFile.size || 0,
        writable: false,
      });

      setSelectedFile(fakeFile);
    }
  }, [currentFile]);

  useEffect(() => {
    if (dropzoneInitialized.current) {
      return;
    }
    console.log("dropzoneInitialized.current", dropzoneInitialized.current);

    Dropzone.autoDiscover = false;

    // Инициализация Dropzone
    const dz = new Dropzone(`#${dropzoneId}`, {
      url: "http://localhost:4000/api/upload",
      maxFilesize: 5,
      acceptedFiles: ".pdf",
      paramName: "file",
      autoProcessQueue: false,
      dictDefaultMessage: "",
      clickable: ".dropzone-clickable",
      previewsContainer: false,
      createImageThumbnails: false,
      maxFiles: 1,
    });

    // Добавьте обработчик для отклонения не-PDF файлов
    dz.on("error", (file, message) => {
      if (message.includes("You can't upload files of this type")) {
        alert("Пожалуйста, загрузите только PDF файлы");
      }
      dz.removeFile(file);
    });

    dz.on("addedfile", (file) => {
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
      console.log("addedfile", file);
    });

    dz.on("success", (file, response) => {
      const fileId = response?.id || null;
      if (onFileSelect) onFileSelect(file, fileId);
      console.log("addedfile", file, fileId);
    });

    dz.on("dragenter", () => setIsDragActive(true));
    dz.on("dragleave", () => setIsDragActive(false));
    dz.on("drop", () => setIsDragActive(false));

    dzRef.current = dz;
    dropzoneInitialized.current = true;

    return () => {
      if (dzRef.current) {
        dzRef.current.destroy();
        dzRef.current = null;
      }
      dropzoneInitialized.current = false;
    };
  }, [dropzoneId, onFileSelect]);

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (dzRef.current && selectedFile) {
      dzRef.current.removeFile(selectedFile);
      setSelectedFile(null);
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

  return (
    <div className="space-y-4">
      <Card
        className="w-full h-48 flex items-center justify-center p-6 relative overflow-hidden border border-gray-100 rounded-xl shadow-lg"
        style={hasError ? { backgroundColor: "#fee7ef" } : {}}
      >
        <form
          id={dropzoneId}
          className="dropzone w-full h-full flex items-center justify-center relative z-10"
          style={{ border: "none", position: "relative" }}
        >
          <div className="dropzone-clickable w-full h-full flex items-center justify-center cursor-pointer">
            {!selectedFile ? (
              <div
                className="text-center input-header"
                style={hasError ? { color: "#f31260" } : { color: "#71717a" }}
              >
                <div className="font-medium text-lg mb-2">
                  Перетащите файл сюда
                </div>

                <div className="font-normal text-base mb-4 opacity-90">
                  или кликните для выбора
                  <span className="text-red-500 ml-1">*</span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#BD9673]/10 to-[#7D5E42]/10 rounded-full border border-[#BD9673]/20">
                  <span className="text-[#7D5E42]">📄</span>
                  <span className="text-sm font-medium text-[#7D5E42]">
                    Только PDF файлы
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full relative z-20">
                <div className="relative backdrop-blur-sm bg-white/80 rounded-xl p-2">
                  <div className="px-6 py-4 bg-gradient-to-r from-[#BD9673]/20 to-[#7D5E42]/20 rounded-lg border border-[#BD9673]/40 flex items-center space-x-4 shadow-lg">
                    <div className="text-3xl bg-white/90 p-3 rounded-lg shadow">
                      {getFileIcon(selectedFile.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-gray-900 text-base overflow-hidden whitespace-nowrap"
                        style={{
                          display: "block",
                          textOverflow: "ellipsis",
                          maxWidth: "180px", // Настройте под ваш дизайн
                        }}
                        title={selectedFile.name}
                      >
                        {selectedFile.name}
                      </p>
                      <p className="text-base text-gray-600 mt-1">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(e);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg hover:scale-110 z-30"
                    aria-label="Удалить файл"
                  >
                    <span className="text-sm font-bold">×</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </Card>

      {selectedFile && selectedFile.size > 0 && onPreview && (
        <Button
          onPress={onPreview}
          className="w-full px-5 py-2.5 rounded-lg border button-safe-font bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white-400  hover:opacity-90 transition-all"
        >
          <span className="font-semibold">Предпросмотр файла</span>
        </Button>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 0.3;
            transform: scale(0.95);
          }
          100% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
