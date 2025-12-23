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

// export default function ModalAddScore() {
//   const { isOpen, onOpen, onOpenChange } = useDisclosure();
//   const {
//     isOpen: isPreviewOpen,
//     onOpen: onOpenPreview,
//     onClose: onClosePreview,
//   } = useDisclosure();

//   const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
//   const [isSaved, setIsSaved] = React.useState(false);
//   const [name, setName] = useState("");
//   const [author, setAuthor] = useState("");
//   const [category, setCategory] = useState(""); // Состояние для категории

//   React.useEffect(() => {
//     if (!isOpen && !isSaved) setSelectedFile(null);
//     if (!isOpen) setIsSaved(false);
//   }, [isOpen, isSaved]);

//   const handleSave = (onClose: () => void) => {
//     const data: Song = {
//       name,
//       author,
//       file: selectedFile,
//       docType: "song",
//       category,
//     };
//     setIsSaved(true);
//     addSong(data);

//     addToast({
//       title: <span className="font-bold text-white">Партитура добавлена</span>,
//       description: (
//         <span className="text-white">
//           <span className="font-bold">{name}</span> | {author}
//         </span>
//       ),
//       timeout: 3000,
//       classNames: {
//         base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white",
//       },
//     });
//     onClose();
//   };

//   const songs = [
//     { label: "Духовные канты", key: "spiritual_chants" },
//     { label: "Пасха", key: "easter" },
//     { label: "Колядки", key: "carols" },
//     { label: "Народные", key: "folk" },
//     { label: "Советские", key: "soviet" },
//     { label: "Военные", key: "military" },
//     { label: "Детские", key: "childrens" },
//     { label: "Другое", key: "other" },
//   ];

//   const [submitted, setSubmitted] = React.useState(null);

//   const onSubmit = (e) => {
//     e.preventDefault();

//     // const data = Object.fromEntries(new FormData(e.currentTarget));

//     // setSubmitted(data);
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
//                       errorMessage="Введите название партитуры!"
//                       label="Название"
//                       labelPlacement="outside"
//                       placeholder="Введите название партитуры"
//                       onChange={(e) => setName(e.target.value)}
//                       className="input-header"
//                     />
//                   </div>

//                   <Select
//                     isRequired
//                     errorMessage="Выберите категорию!"
//                     label="Категория"
//                     placeholder="Выберите категорию"
//                     labelPlacement="outside"
//                     scrollShadowProps={{
//                       isEnabled: false,
//                     }}
//                     description={
//                       <div style={{ height: "24px", color: "white" }}></div>
//                     }
//                     onSelectionChange={(keys) =>
//                       setCategory(Array.from(keys)[0] as string)
//                     }
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
//                   />

//                   <Input
//                     label="Автор аранжировки"
//                     labelPlacement="outside"
//                     placeholder="Введите автора"
//                     className="input-header"
//                     description="Полное имя и фамилия, напр.: Иван Иванов"
//                   />
//                 </div>

//                 <div className="mt-4">
//                   <MyDropzone
//                     onFileSelect={setSelectedFile}
//                     onPreview={onOpenPreview}
//                   />
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
import React, { ChangeEvent, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  useDisclosure,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";

import MyDropzone from "./dropzone";
import ModalFilePreviewer from "./modalFilePreviewer";
import { addSong } from "@/actions/actions";
import { Song } from "@/lib/types";
import { Pattern } from "@/components/pattern";
import { useRouter } from "next/navigation";

export default function ModalAddScore() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isPreviewOpen,
    onOpen: onOpenPreview,
    onClose: onClosePreview,
  } = useDisclosure();

  const router = useRouter();

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isSaved, setIsSaved] = React.useState(false);
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const handleToastClick = () => {
    router.push(`/song/0.3900788308131493`);
  };

  // Добавляем состояние для ошибок валидации
  const [validationErrors, setValidationErrors] = useState({
    name: false,
    category: false,
    file: false,
  });

  React.useEffect(() => {
    if (!isOpen && !isSaved) {
      setSelectedFile(null);
      // Сбрасываем ошибки при закрытии модального окна
      setValidationErrors({
        name: false,
        category: false,
        file: false,
      });
    }
    if (!isOpen) setIsSaved(false);
  }, [isOpen, isSaved]);

  // Функция валидации формы
  const validateForm = () => {
    const errors = {
      name: !name.trim(),
      category: !category,
      file: !selectedFile,
    };

    setValidationErrors(errors);

    // Возвращает true, если нет ошибок
    return !errors.name && !errors.category && !errors.file;
  };

  const handleSave = (onClose: () => void) => {
    // Проверяем форму перед сохранением
    if (!validateForm()) {
      // Показываем ошибки и не сохраняем
      console.log("Форма не прошла валидацию", validationErrors);
      return;
    }

    // Если валидация прошла, продолжаем сохранение
    const data: Song = {
      name,
      author,
      file: selectedFile,
      docType: "song",
      category,
    };

    setIsSaved(true);
    addSong(data);

    addToast({
      title: <span className="font-bold text-white">Партитура добавлена</span>,
      description: (
        <div onClick={handleToastClick} className="text-white">
          <div className="flex gap-6">
            {/* Колонка 1: Название и категория */}
            <div className="flex flex-col">
              <span className="font-bold text-lg">{name}</span>
              <span className="text-sm opacity-90 mt-1">{category}</span>
            </div>

            {/* Колонка 2: Автор (если есть) */}
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

  const songs = [
    { label: "Духовные канты", key: "spiritual_chants" },
    { label: "Пасха", key: "easter" },
    { label: "Колядки", key: "carols" },
    { label: "Народные", key: "folk" },
    { label: "Советские", key: "soviet" },
    { label: "Военные", key: "military" },
    { label: "Детские", key: "childrens" },
    { label: "Другое", key: "other" },
  ];

  return (
    <>
      <Button
        className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full px-6 py-2 text-2xl font-normal shadow-md relative overflow-hidden group"
        onPress={onOpen}
      >
        <span className="relative z-10">+</span>
      </Button>

      <Modal
        isDismissable={false}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="top"
        size="3xl"
        classNames={{
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
              <ModalHeader className="flex flex-col text-center justify-center font-header gap-4">
                Добавить новую партитуру
              </ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                  <div className="md:col-span-2">
                    <Input
                      isRequired
                      errorMessage={
                        validationErrors.name
                          ? "Введите название партитуры!"
                          : ""
                      }
                      isInvalid={validationErrors.name}
                      label="Название"
                      labelPlacement="outside"
                      placeholder="Введите название партитуры"
                      onChange={(e) => {
                        setName(e.target.value);
                        // Сбрасываем ошибку при вводе
                        if (validationErrors.name) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            name: false,
                          }));
                        }
                      }}
                      className="input-header"
                    />
                  </div>

                  <Select
                    isRequired
                    errorMessage={
                      validationErrors.category ? "Выберите категорию!" : ""
                    }
                    isInvalid={validationErrors.category}
                    label="Категория"
                    placeholder="Выберите категорию"
                    labelPlacement="outside"
                    scrollShadowProps={{
                      isEnabled: false,
                    }}
                    description={
                      <div style={{ height: "24px", color: "white" }}></div>
                    }
                    onSelectionChange={(keys) => {
                      setCategory(Array.from(keys)[0] as string);
                      // Сбрасываем ошибку при выборе
                      if (validationErrors.category) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          category: false,
                        }));
                      }
                    }}
                    className="input-header"
                  >
                    {songs.map((song) => (
                      <SelectItem key={song.key} textValue={song.label}>
                        {song.label}
                      </SelectItem>
                    ))}
                  </Select>

                  <Input
                    label="Автор музыки"
                    labelPlacement="outside"
                    placeholder="Введите автора"
                    onChange={(e) => setAuthor(e.target.value)}
                    className="input-header"
                    description="Полное имя и фамилия, напр.: Иван Иванов"
                  />

                  <Input
                    label="Автор слов"
                    labelPlacement="outside"
                    placeholder="Введите автора"
                    className="input-header"
                    description="Полное имя и фамилия, напр.: Иван Иванов"
                  />

                  <Input
                    label="Автор аранжировки"
                    labelPlacement="outside"
                    placeholder="Введите автора"
                    className="input-header"
                    description="Полное имя и фамилия, напр.: Иван Иванов"
                  />
                </div>

                <div className="mt-4">
                  <MyDropzone
                    onFileSelect={(file) => {
                      setSelectedFile(file);
                      // Сбрасываем ошибку при выборе файла
                      if (validationErrors.file) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          file: false,
                        }));
                      }
                    }}
                    onPreview={onOpenPreview}
                    hasError={validationErrors.file}
                  />

                  {/* Сообщение об ошибке для Dropzone */}
                  {validationErrors.file && (
                    // <p className="text-danger text-sm mt-2 ml-1">
                    <div className="text-tiny text-danger text-center mt-2 input-header">
                      Пожалуйста, загрузите файл!
                    </div>
                  )}
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
