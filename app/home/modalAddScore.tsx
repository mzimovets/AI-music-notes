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
} from "@heroui/react";
import { addToast } from "@heroui/toast";

import MyDropzone from "./dropzone";
import ModalFilePreviewer from "./modalFilePreviewer";
import { addSong } from "@/actions/actions";
import { Reprise, Song } from "@/lib/types";
import { Pattern } from "@/components/pattern";
import { useRouter } from "next/navigation";
import { getCategoryDisplay } from "@/lib/utils";
import { AddSongIcon } from "@/components/icons/AddSongIcon";
import { useAllSongsLibraryContextProvider } from "../providers";
import { enqueue, storeFile } from "@/lib/offline-queue";
import { getBackendBaseUrl } from "@/lib/client-url";

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

export default function ModalAddScore({isOpen, onOpen, onOpenChange}: {isOpen: boolean, onOpen: () => void, onOpenChange: (open: boolean) => void}) {
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
  const [reprises, setReprises] = useState<Reprise[]>([]);
  const [repriseRaw, setRepriseRaw] = useState<{ from: string; to: string }[]>([]);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const { allSongs, setAllSongs } = useAllSongsLibraryContextProvider();

  const [validationErrors, setValidationErrors] = useState({
    name: false,
    category: false,
    file: false,
  });

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setName("");
      setAuthor("");
      setAuthorLyrics("");
      setAuthorArrange("");
      setCategory("");
      setReprises([]);
      setRepriseRaw([]);
      setSaveAttempted(false);
      setNumPages(0);
      setValidationErrors({ name: false, category: false, file: false });
      setIsSaved(false);
    }
  }, [isOpen]);

  const validateForm = () => {
    const errors = {
      name: !name.trim(),
      category: !category,
      file: !selectedFile,
    };
    setValidationErrors(errors);
    return !errors.name && !errors.category && !errors.file;
  };

  const fetchAllSongs = async () => {
    try {
      const response = await fetch(`${getBackendBaseUrl()}/songs`);
      const data = await response.json();

      if (data.status === "ok" && data.docs) {
        const songs = data.docs
          .filter((song) => song.docType === "song")
          .map((song) => ({
            _id: song._id,
            name: song.doc?.name || song.name || "",
            author: song.doc?.author || song.author || "",
            authorLyrics: song.doc?.authorLyrics || song.authorLyrics || "",
            authorArrange: song.doc?.authorArrange || song.authorArrange || "",
            category: song.doc?.category || song.category || "",
            file: song.doc?.file || song.file || {},
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "ru"));

        setAllSongs(songs);
      }
    } catch (error) {
      console.error("Ошибка при загрузке песен:", error);
    }
  };

  const handleSave = async (onClose: () => void) => {
    const hasRepriseErrors =
      repriseRaw.some((r) => r.from === "" || r.to === "") ||
      reprises.some((r) => r.fromPage === r.toPage && r.fromPage !== 0);
    if (hasRepriseErrors) { setSaveAttempted(true); return; }
    if (!validateForm()) return;
    setIsSaved(true);

    if (!navigator.onLine) {
      // ── Офлайн: сохраняем в очередь ──────────────────────────────
      const fileDbKey = await storeFile(selectedFile as File);
      const tempId = Math.random().toString();
      enqueue({
        type: "song.create",
        tempId,
        name,
        author: author || "",
        authorLyrics: authorLyrics || "",
        authorArrange: authorArrange || "",
        category,
        reprises: reprises.length > 0 ? reprises : undefined,
        fileDbKey,
        filename: (selectedFile as File).name,
      });
      addToast({
        title: <span className="font-bold text-white">Сохранено офлайн</span>,
        description: (
          <span className="text-white">
            «{name}» добавится на сервер при восстановлении соединения
          </span>
        ),
        timeout: 4000,
        classNames: { base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white" },
      });
      onClose();
      return;
    }

    // ── Онлайн: обычный путь ────────────────────────────────────────
    const data: Song = {
      name,
      author,
      file: selectedFile,
      docType: "song",
      category,
      authorArrange,
      authorLyrics,
      reprises: reprises.length > 0 ? reprises : undefined,
    };

    try {
      const response = await addSong(data, window.location.pathname);
      addToast({
        title: <span className="font-bold text-white">Партитура добавлена</span>,
        description: (
          <div
            onClick={() => router.push(`/song/${response.doc._id}`)}
            className="text-white cursor-pointer"
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
        classNames: { base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white" },
      });

      await fetchAllSongs();
      window.dispatchEvent(new CustomEvent("sw-sync-needed"));
    } catch (e) {
      // navigator.onLine может быть true даже без интернета — сохраняем офлайн
      console.warn("[Song] Сеть недоступна, сохраняем офлайн:", e);
      const fileDbKey = await storeFile(selectedFile as File);
      const tempId = Math.random().toString();
      enqueue({
        type: "song.create",
        tempId,
        name,
        author: author || "",
        authorLyrics: authorLyrics || "",
        authorArrange: authorArrange || "",
        category,
        reprises: reprises.length > 0 ? reprises : undefined,
        fileDbKey,
        filename: (selectedFile as File).name,
      });
      addToast({
        title: <span className="font-bold text-white">Сохранено офлайн</span>,
        description: (
          <span className="text-white">
            «{name}» добавится на сервер при восстановлении соединения
          </span>
        ),
        timeout: 4000,
        classNames: { base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white" },
      });
    }
    onClose();
  };

  return (
    <>
       <Modal
        isDismissable={false}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center"
        size="3xl"
        backdrop="blur"
        classNames={{
          base: "mt-100 shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl",
        }}
      >
        <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl overflow-scroll">
          {(onClose) => (
            <>
              <div className="absolute top-3 left-2 z-50">
                <Pattern width={86} height={80} className="opacity-80" />
              </div>

              {/* Заголовок */}
              {/* className="p-0 flex flex-col text-center justify-center font-header gap-4" */}
              <ModalHeader className="mx-auto text-center font-header">
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
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (validationErrors.name)
                          setValidationErrors((prev) => ({
                            ...prev,
                            name: false,
                          }));
                      }}
                      className="input-header mb-0"
                      classNames={{ label: "input-header" }}
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
                      selectedKeys={category ? [category] : []}
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
                  <div className="mt-4 rounded-xl bg-white/10 p-4 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Автор музыки"
                      labelPlacement="outside"
                      placeholder="Введите автора"
                      value={author}
                      description={
                        <span className="input-header text-gray-600" style={{ fontSize: "12px" }}>
                          Полное имя и фамилия, напр.: Иван Иванов
                        </span>
                      }
                      onChange={(e) => setAuthor(e.target.value)}
                      className="input-header mb-0"
                      classNames={{ label: "input-header" }}
                    />
                    <Input
                      label="Автор слов"
                      labelPlacement="outside"
                      placeholder="Введите автора"
                      value={authorLyrics}
                      description={
                        <span className="input-header text-gray-600" style={{ fontSize: "12px" }}>
                          Полное имя и фамилия, напр.: Иван Иванов
                        </span>
                      }
                      onChange={(e) => setAuthorLyrics(e.target.value)}
                      className="input-header mb-0"
                      classNames={{ label: "input-header" }}
                    />
                    <Input
                      label="Автор аранжировки"
                      labelPlacement="outside"
                      placeholder="Введите автора"
                      value={authorArrange}
                      description={
                        <span className="input-header text-gray-600" style={{ fontSize: "12px" }}>
                          Полное имя и фамилия, напр.: Иван Иванов
                        </span>
                      }
                      onChange={(e) => setAuthorArrange(e.target.value)}
                      className="input-header mb-0"
                      classNames={{ label: "input-header" }}
                    />
                  </div>

                  {/* Репризы — только после прикрепления файла с 2+ страницами */}
                  {selectedFile && numPages !== 1 && <div className="rounded-xl bg-white/10 p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold input-header text-default-700">
                        Репризы
                      </span>
                      <Button
                        size="sm"
                        className="input-header bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white"
                        onPress={() => {
                          setReprises((r) => [...r, { fromPage: 0, toPage: 0 }]);
                          setRepriseRaw((r) => [...r, { from: "", to: "" }]);
                        }}
                      >
                        + Добавить
                      </Button>
                    </div>
                    {numPages > 0 && (
                      <p className="text-xs text-default-400 input-header mb-2">
                        Страниц в файле: {numPages}
                      </p>
                    )}
                    {reprises.length === 0 ? (
                      <p className="text-xs text-default-400 input-header">
                        Нет реприз. Нажмите «+ Добавить», чтобы указать переход между страницами
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {reprises.map((r, i) => {
                          const rawFrom = parseInt(repriseRaw[i]?.from || "0") || 0;
                          const rawTo = parseInt(repriseRaw[i]?.to || "0") || 0;
                          const isEmpty = repriseRaw[i]?.from === "" || repriseRaw[i]?.to === "";
                          const isSamePage = !isEmpty && rawFrom > 0 && rawTo > 0 && rawFrom === rawTo;
                          return (
                            <div key={i} className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-default-500 input-header whitespace-nowrap">
                                  На стр.
                                </span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  size="sm"
                                  value={repriseRaw[i]?.from ?? String(r.fromPage)}
                                  isInvalid={isSamePage || (saveAttempted && repriseRaw[i]?.from === "")}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, "");
                                    setRepriseRaw((prev) =>
                                      prev.map((x, j) => j === i ? { ...x, from: raw } : x)
                                    );
                                  }}
                                  onBlur={() => {
                                    const raw = repriseRaw[i]?.from;
                                    if (!raw) return;
                                    const clamped = numPages > 0
                                      ? Math.min(numPages, Math.max(1, parseInt(raw) || 1))
                                      : Math.max(1, parseInt(raw) || 1);
                                    setRepriseRaw((prev) =>
                                      prev.map((x, j) => j === i ? { ...x, from: String(clamped) } : x)
                                    );
                                    setReprises((prev) =>
                                      prev.map((x, j) => j === i ? { ...x, fromPage: clamped } : x)
                                    );
                                  }}
                                  classNames={{ input: "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" }}
                                  className="input-header w-20"
                                />
                                <span className="text-xs text-default-500 input-header whitespace-nowrap">
                                  → перейти на стр.
                                </span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  size="sm"
                                  value={repriseRaw[i]?.to ?? String(r.toPage)}
                                  isInvalid={isSamePage || (saveAttempted && repriseRaw[i]?.to === "")}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, "");
                                    setRepriseRaw((prev) =>
                                      prev.map((x, j) => j === i ? { ...x, to: raw } : x)
                                    );
                                  }}
                                  onBlur={() => {
                                    const raw = repriseRaw[i]?.to;
                                    if (!raw) return;
                                    const clamped = numPages > 0
                                      ? Math.min(numPages, Math.max(1, parseInt(raw) || 1))
                                      : Math.max(1, parseInt(raw) || 1);
                                    setRepriseRaw((prev) =>
                                      prev.map((x, j) => j === i ? { ...x, to: String(clamped) } : x)
                                    );
                                    setReprises((prev) =>
                                      prev.map((x, j) => j === i ? { ...x, toPage: clamped } : x)
                                    );
                                  }}
                                  classNames={{ input: "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" }}
                                  className="input-header w-20"
                                />
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  className="text-danger min-w-unit-8 w-8 h-8"
                                  onPress={() => {
                                    setReprises((prev) => prev.filter((_, j) => j !== i));
                                    setRepriseRaw((prev) => prev.filter((_, j) => j !== i));
                                  }}
                                >
                                  ✕
                                </Button>
                              </div>
                              {saveAttempted && isEmpty && (
                                <p className="text-xs text-danger input-header">
                                  Заполните оба поля
                                </p>
                              )}
                              {isSamePage && (
                                <p className="text-xs text-danger input-header">
                                  Страницы не могут совпадать
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>}

                  <div className="mt-4">
                    <MyDropzone
                      className="mt-4  rounded-xl bg-white/10 p-4 shadow-lg "
                      cardClassName="bg-transparent shadow-none border-none !important"
                      onFileSelect={async (file) => {
                        setSelectedFile(file);
                        if (!file) {
                          setReprises([]);
                          setRepriseRaw([]);
                          setNumPages(0);
                        } else {
                          try {
                            const pdfjsLib = await import("pdfjs-dist/build/pdf");
                            (pdfjsLib as any).GlobalWorkerOptions.workerSrc = "/api/pdf-worker";
                            const buf = await file.arrayBuffer();
                            const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
                            setNumPages(pdf.numPages);
                          } catch {}
                        }
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
                  className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42]  text-white shadow-lg input-header"
                  isDisabled={
                    repriseRaw.some((r) => r.from === "" || r.to === "") ||
                    reprises.some((r) => r.fromPage !== 0 && r.fromPage === r.toPage)
                  }
                  onPress={() => handleSave(onClose)}
                >
                  Добавить в базу
                </Button>
              </ModalFooter>

              <div className="absolute bottom-3 right-2 z-50">
                <Pattern
                  width={86}
                  height={76}
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
