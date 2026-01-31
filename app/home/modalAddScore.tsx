// "use client";
// import React, { ChangeEvent, useState } from "react";
// import {
//   Modal,
//   ModalContent,
//   ModalHeader,
//   ModalBody,
//   ModalFooter,
//   Button,
//   Input,
//   useDisclosure,
//   Select,
//   SelectItem,
//   addToast,
// } from "@heroui/react";

// import MyDropzone from "./dropzone";
// import ModalFilePreviewer from "./modalFilePreviewer";
// import { addSong } from "@/actions/actions";
// import { Song } from "@/lib/types";
// import { Pattern } from "@/components/pattern";
// import { useRouter } from "next/navigation";
// import { getCategoryDisplay } from "@/lib/utils";

// export const songs = [
//   { label: "Духовные канты", key: "spiritual_chants" },
//   { label: "Пасха", key: "easter" },
//   { label: "Колядки", key: "carols" },
//   { label: "Народные", key: "folk" },
//   { label: "Советские", key: "soviet" },
//   { label: "Военные", key: "military" },
//   { label: "Детские", key: "childrens" },
//   { label: "Другое", key: "other" },
// ];

// export default function ModalAddScore() {
//   const { isOpen, onOpen, onOpenChange } = useDisclosure();
//   const {
//     isOpen: isPreviewOpen,
//     onOpen: onOpenPreview,
//     onClose: onClosePreview,
//   } = useDisclosure();

//   const router = useRouter();

//   const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
//   const [isSaved, setIsSaved] = React.useState(false);
//   const [name, setName] = useState("");
//   const [author, setAuthor] = useState("");
//   const [authorLyrics, setAuthorLyrics] = useState("");
//   const [authorArrange, setAuthorArrange] = useState("");
//   const [category, setCategory] = useState("");
//   const handleToastClick = (id: string) => () => {
//     router.push(`/song/${id}`);
//   };

//   const [validationErrors, setValidationErrors] = useState({
//     name: false,
//     category: false,
//     file: false,
//   });

//   React.useEffect(() => {
//     if (!isOpen && !isSaved) {
//       setSelectedFile(null);
//       // Сбрасываем ошибки при закрытии модального окна
//       setValidationErrors({
//         name: false,
//         category: false,
//         file: false,
//       });
//     }
//     if (!isOpen) setIsSaved(false);
//   }, [isOpen, isSaved]);

//   // Функция валидации формы
//   const validateForm = () => {
//     const errors = {
//       name: !name.trim(),
//       category: !category,
//       file: !selectedFile,
//     };

//     setValidationErrors(errors);

//     // Возвращает true, если нет ошибок
//     return !errors.name && !errors.category && !errors.file;
//   };

//   const handleSave = async (onClose: () => void) => {
//     // Проверяем форму перед сохранением
//     if (!validateForm()) {
//       // Показываем ошибки и не сохраняем
//       console.log("Форма не прошла валидацию", validationErrors);
//       return;
//     }

//     // Если валидация прошла, продолжаем сохранение
//     const data: Song = {
//       name,
//       author,
//       file: selectedFile,
//       docType: "song",
//       category,
//       authorArrange,
//       authorLyrics,
//     };

//     setIsSaved(true);
//     const responsed = await addSong(data);

//     addToast({
//       title: <span className="font-bold text-white">Партитура добавлена</span>,
//       description: (
//         <div
//           onClick={handleToastClick(responsed.doc._id)}
//           className="text-white"
//         >
//           <div className="flex gap-6">
//             {/* Колонка 1: Название и категория */}
//             <div className="flex flex-col">
//               <span className="font-bold text-lg">{name}</span>
//               <span className="text-sm opacity-90 mt-1">
//                 {getCategoryDisplay(category, "full")}
//               </span>
//             </div>

//             {/* Колонка 2: Автор (если есть) */}
//             {author && (
//               <div className="flex flex-col border-l border-white/30 pl-6">
//                 <span className="text-sm opacity-75">Автор</span>
//                 <span className="font-medium mt-1">{author}</span>
//               </div>
//             )}
//           </div>
//         </div>
//       ),
//       timeout: 5000,
//       shouldShowTimeoutProgress: true,
//       classNames: {
//         base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white",
//       },
//     });
//     onClose();
//   };

//   return (
//     <>
//       <Button
//         className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full px-6 py-2 text-2xl font-normal shadow-md relative overflow-hidden group"
//         onPress={onOpen}
//       >
//         <span className="relative z-10">+</span>
//       </Button>

//       <Modal
//         isDismissable={false}
//         isOpen={isOpen}
//         onOpenChange={onOpenChange}
//         placement="top"
//         size="3xl"
//         classNames={{
//           wrapper: "!items-start",
//           base: "-translate-y-10 shadow-2xl",
//           backdrop:
//             "bg-linear-to-t from-[#7D5E42] via-[#BD9673]/50 to-[#BD9673]/10 backdrop-blur-sm",
//         }}
//       >
//         <ModalContent className="p-10">
//           {(onClose) => (
//             <>
//               <div className="absolute top-3 left-2 z-50">
//                 <Pattern width={60} height={55} className="opacity-80" />
//               </div>
//               <ModalHeader className="flex flex-col text-center justify-center font-header gap-4">
//                 Добавить новую партитуру
//               </ModalHeader>
//               <ModalBody>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
//                   <div className="md:col-span-2">
//                     <Input
//                       isRequired
//                       errorMessage={
//                         validationErrors.name
//                           ? "Введите название партитуры!"
//                           : ""
//                       }
//                       isInvalid={validationErrors.name}
//                       label="Название"
//                       labelPlacement="outside"
//                       placeholder="Введите название партитуры"
//                       onChange={(e) => {
//                         setName(e.target.value);
//                         if (validationErrors.name) {
//                           setValidationErrors((prev) => ({
//                             ...prev,
//                             name: false,
//                           }));
//                         }
//                       }}
//                       className="input-header"
//                     />
//                   </div>

//                   <Select
//                     isRequired
//                     errorMessage={
//                       validationErrors.category ? "Выберите категорию!" : ""
//                     }
//                     isInvalid={validationErrors.category}
//                     label="Категория"
//                     placeholder="Выберите категорию"
//                     labelPlacement="outside"
//                     scrollShadowProps={{
//                       isEnabled: false,
//                     }}
//                     description={
//                       <div style={{ height: "24px", color: "white" }}></div>
//                     }
//                     onSelectionChange={(keys) => {
//                       setCategory(Array.from(keys)[0] as string);
//                       // Сбрасываем ошибку при выборе
//                       if (validationErrors.category) {
//                         setValidationErrors((prev) => ({
//                           ...prev,
//                           category: false,
//                         }));
//                       }
//                     }}
//                     className="input-header"
//                   >
//                     {songs.map((song) => (
//                       <SelectItem key={song.key} textValue={song.label}>
//                         {song.label}
//                       </SelectItem>
//                     ))}
//                   </Select>

//                   <Input
//                     label="Автор музыки"
//                     labelPlacement="outside"
//                     placeholder="Введите автора"
//                     onChange={(e) => setAuthor(e.target.value)}
//                     className="input-header"
//                     description="Полное имя и фамилия, напр.: Иван Иванов"
//                   />

//                   <Input
//                     label="Автор слов"
//                     labelPlacement="outside"
//                     placeholder="Введите автора"
//                     className="input-header"
//                     description="Полное имя и фамилия, напр.: Иван Иванов"
//                     onChange={(e) => setAuthorLyrics(e.target.value)}
//                   />

//                   <Input
//                     label="Автор аранжировки"
//                     labelPlacement="outside"
//                     placeholder="Введите автора"
//                     className="input-header"
//                     description="Полное имя и фамилия, напр.: Иван Иванов"
//                     onChange={(e) => setAuthorArrange(e.target.value)}
//                   />
//                 </div>

//                 <div className="mt-4">
//                   <MyDropzone
//                     onFileSelect={(file) => {
//                       setSelectedFile(file);
//                       // Сбрасываем ошибку при выборе файла
//                       if (validationErrors.file) {
//                         setValidationErrors((prev) => ({
//                           ...prev,
//                           file: false,
//                         }));
//                       }
//                     }}
//                     onPreview={onOpenPreview}
//                     hasError={validationErrors.file}
//                   />

//                   {/* Сообщение об ошибке для Dropzone */}
//                   {validationErrors.file && (
//                     // <p className="text-danger text-sm mt-2 ml-1">
//                     <div className="text-tiny text-danger text-center mt-2 input-header">
//                       Пожалуйста, загрузите файл!
//                     </div>
//                   )}
//                 </div>
//               </ModalBody>
//               <ModalFooter className="flex justify-center">
//                 <Button
//                   type="submit"
//                   className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-lg input-header"
//                   onPress={() => handleSave(onClose)}
//                 >
//                   Добавить в базу
//                 </Button>
//               </ModalFooter>
//               <div className="absolute bottom-3 right-2 z-50">
//                 <Pattern
//                   width={60}
//                   height={55}
//                   className="scale-y-[-1] scale-x-[-1] opacity-80"
//                 />
//               </div>
//             </>
//           )}
//         </ModalContent>
//       </Modal>

//       <ModalFilePreviewer
//         isOpen={isPreviewOpen}
//         onClose={onClosePreview}
//         selectedFile={selectedFile}
//       />
//     </>
//   );
// }

"use client";
import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  useDisclosure,
  addToast,
} from "@heroui/react";

import MyDropzone from "./dropzone";
import ModalFilePreviewer from "./modalFilePreviewer";
import { addSong } from "@/actions/actions";
import { Song } from "@/lib/types";
import { Pattern } from "@/components/pattern";
import { useRouter } from "next/navigation";
import { getCategoryDisplay } from "@/lib/utils";
import { AddSongIcon } from "@/components/icons/AddSongIcon";

export const songs = [
  { label: "Духовные канты", key: "spiritual_chants" },
  { label: "Пасха", key: "easter" },
  { label: "Колядки", key: "carols" },
  { label: "Народные", key: "folk" },
  { label: "Советские", key: "soviet" },
  { label: "Военные", key: "military" },
  { label: "Детские", key: "childrens" },
  { label: "Другое", key: "other" },
];

export default function ModalAddScore() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isPreviewOpen,
    onOpen: onOpenPreview,
    onClose: onClosePreview,
  } = useDisclosure();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [authorLyrics, setAuthorLyrics] = useState("");
  const [authorArrange, setAuthorArrange] = useState("");
  const [category, setCategory] = useState("");

  const [validationErrors, setValidationErrors] = useState({
    name: false,
    category: false,
    file: false,
  });

  useEffect(() => {
    if (!isOpen && !isSaved) {
      setSelectedFile(null);
      setValidationErrors({ name: false, category: false, file: false });
    }
    if (!isOpen) setIsSaved(false);
  }, [isOpen, isSaved]);

  const validateForm = () => {
    const errors = {
      name: !name.trim(),
      category: !category,
      file: !selectedFile,
    };
    setValidationErrors(errors);
    return !errors.name && !errors.category && !errors.file;
  };

  const handleSave = async (onClose: () => void) => {
    if (!validateForm()) return;

    const data: Song = {
      name,
      author,
      file: selectedFile,
      docType: "song",
      category,
      authorArrange,
      authorLyrics,
    };
    setIsSaved(true);

    const response = await addSong(data);

    addToast({
      title: <span className="font-bold text-white">Партитура добавлена</span>,
      description: (
        <div
          onClick={() => router.push(`/song/${response.doc._id}`)}
          className="text-white"
        >
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="font-bold text-lg">{name}</span>
              <span className="text-sm opacity-90 mt-1">
                {getCategoryDisplay(category, "full")}
              </span>
            </div>
            {author && (
              <div className="flex flex-col border-l border-white/30 pl-6">
                <span className="text-sm opacity-75">Автор</span>
                <span className="font-medium mt-1">{author}</span>
              </div>
            )}
          </div>
        </div>
      ),
      timeout: 5000,
      shouldShowTimeoutProgress: true,
      classNames: {
        base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white",
      },
    });

    onClose();
  };

  return (
    <>
      <Button
        className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full  text-2xl font-normal shadow-md relative overflow-hidden group"
        onPress={onOpen}
        radius="full"
        isIconOnly
      >
        <AddSongIcon />
      </Button>

      <Modal
        isDismissable={false}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center"
        size="3xl"
        classNames={{
          wrapper: "!items-start",
          base: "-translate-y-10 shadow-2xl",
          backdrop:
            "bg-linear-to-t from-[#7D5E42] via-[#BD9673]/50 to-[#BD9673]/10 backdrop-blur-sm",
        }}
      >
        <ModalContent className="p-10">
          {(onClose) => (
            <>
              <div className="absolute top-3 left-2 z-50">
                <Pattern width={60} height={55} className="opacity-80" />
              </div>

              {/* Заголовок */}
              <ModalHeader className="p-0 flex flex-col text-center justify-center font-header gap-4">
                Добавить новую партитуру
              </ModalHeader>

              <ModalBody>
                <div className="space-y-6">
                  {/* Название и категория */}
                  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0 items-start">
                    <Input
                      isRequired
                      isInvalid={validationErrors.name}
                      errorMessage={
                        validationErrors.name
                          ? "Введите название партитуры!"
                          : ""
                      }
                      label="Название"
                      labelPlacement="outside"
                      placeholder="Введите название партитуры"
                      onChange={(e) => {
                        setName(e.target.value);
                        if (validationErrors.name)
                          setValidationErrors((prev) => ({
                            ...prev,
                            name: false,
                          }));
                      }}
                      className="input-header mb-0"
                    />

                    <Select
                      isRequired
                      isInvalid={validationErrors.category}
                      errorMessage={
                        validationErrors.category ? "Выберите категорию!" : ""
                      }
                      label={<span>Категория</span>}
                      placeholder="Выберите категорию"
                      labelPlacement="outside"
                      scrollShadowProps={{ isEnabled: false }}
                      onSelectionChange={(keys) => {
                        setCategory(Array.from(keys)[0] as string);
                        if (validationErrors.category)
                          setValidationErrors((prev) => ({
                            ...prev,
                            category: false,
                          }));
                      }}
                      className="input-header mb-0 "
                    >
                      {songs.map((song) => (
                        <SelectItem
                          className="input-header"
                          key={song.key}
                          textValue={song.label}
                        >
                          {song.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  {/* Авторы */}
                  <div className="mt-4 border border-gray-100 rounded-xl bg-white/10 p-4 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Автор музыки"
                      labelPlacement="outside"
                      placeholder="Введите автора"
                      description="Полное имя и фамилия, напр.: Иван Иванов"
                      onChange={(e) => setAuthor(e.target.value)}
                      className="input-header mb-0"
                    />
                    <Input
                      label="Автор слов"
                      labelPlacement="outside"
                      placeholder="Введите автора"
                      description="Полное имя и фамилия, напр.: Иван Иванов"
                      onChange={(e) => setAuthorLyrics(e.target.value)}
                      className="input-header mb-0"
                    />
                    <Input
                      label="Автор аранжировки"
                      labelPlacement="outside"
                      placeholder="Введите автора"
                      description="Полное имя и фамилия, напр.: Иван Иванов"
                      onChange={(e) => setAuthorArrange(e.target.value)}
                      className="input-header mb-0"
                    />
                  </div>

                  <div className="mt-4">
                    <MyDropzone
                      onFileSelect={(file) => {
                        setSelectedFile(file);
                        if (validationErrors.file)
                          setValidationErrors((prev) => ({
                            ...prev,
                            file: false,
                          }));
                      }}
                      onPreview={onOpenPreview}
                      hasError={validationErrors.file}
                    />
                    {validationErrors.file && (
                      <div className="text-tiny text-danger text-center mt-2 input-header">
                        Пожалуйста, загрузите файл!
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="flex justify-center">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-lg input-header"
                  onPress={() => handleSave(onClose)}
                >
                  Добавить в базу
                </Button>
              </ModalFooter>

              <div className="absolute bottom-3 right-2 z-50">
                <Pattern
                  width={60}
                  height={55}
                  className="scale-y-[-1] scale-x-[-1] opacity-80"
                />
              </div>
            </>
          )}
        </ModalContent>
      </Modal>

      <ModalFilePreviewer
        isOpen={isPreviewOpen}
        onClose={onClosePreview}
        selectedFile={selectedFile}
      />
    </>
  );
}
