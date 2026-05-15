"use client";
import MyDropzone from "@/app/home/dropzone";
import ModalFilePreviewer from "@/app/home/modalFilePreviewer";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { useEffect, useState } from "react";
import { SongContextProvider, useSongContext } from "../SongContextProvider";
import { SongActions } from "./SongActions";
import { getCategoryDisplay } from "@/lib/utils";
import { InfoCardInput } from "./InfoCardInput";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { editSong, removeSong } from "@/actions/actions";
import { enqueue, storeFile } from "@/lib/offline-queue";
import { Reprise, Song } from "@/lib/types";
import { Input } from "@heroui/input";
import { useSession } from "next-auth/react";
import { recacheSong } from "@/lib/recache-song";
import { useParams } from "next/navigation";

export const InfoCard = () => {
  const { data: session } = useSession();
  const [isEdit, setIsEdit] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const params = useParams<{ id: string }>();
  const context = useSongContext();
  const song = context.songResponse;

  const [name, setName] = useState(song.doc.name);
  const [author, setAuthor] = useState(song.doc.author);
  const [authorLyrics, setAuthorLyrics] = useState(song.doc.authorLyrics);
  const [authorArrange, setAuthorArrange] = useState(song.doc.authorArrange);
  const [category, setCategory] = useState(song.doc.category);
  const [reprises, setReprises] = useState<Reprise[]>(
    (song.doc as any).reprises || [],
  );
  const [numPages, setNumPages] = useState<number>(0);
  // Сырые строки инпутов — чтобы пользователь мог свободно стирать и вводить цифры
  const [repriseRaw, setRepriseRaw] = useState<{ from: string; to: string }[]>(
    () =>
      ((song.doc as any).reprises || []).map((r: Reprise) => ({
        from: String(r.fromPage),
        to: String(r.toPage),
      })),
  );
  const [saveAttempted, setSaveAttempted] = useState(false);

  const onLoad = async () => {
    const url = `/uploads/${song.doc.file.filename}`;
    setSelectedFile(url);
    try {
      const pdfjsLib = await import("pdfjs-dist/build/pdf");
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = "/api/pdf-worker";
      const pdf = await (pdfjsLib as any).getDocument(url).promise;
      setNumPages(pdf.numPages);
    } catch {}
  };

  useEffect(() => {
    onLoad();
  }, []);

  const handleEdit = () => setIsEdit(!isEdit);
  const handlePreview = () => {
    setIsPreviewModalOpen(true);
  };

  const hasRepriseErrors =
    repriseRaw.some((r) => r.from === "" || r.to === "") ||
    reprises.some((r) => r.fromPage === r.toPage);

  const handleSave = async () => {
    if (hasRepriseErrors) {
      setSaveAttempted(true);
      return;
    }
    if (!navigator.onLine) {
      let fileDbKey: string | undefined;
      let filename: string | undefined;
      if (selectedFile && typeof selectedFile !== "string") {
        fileDbKey = await storeFile(selectedFile as File);
        filename = (selectedFile as File).name;
      }
      enqueue({
        type: "song.edit",
        id: song.doc._id,
        name,
        author: author || "",
        authorLyrics: authorLyrics || "",
        authorArrange: authorArrange || "",
        category,
        reprises: reprises.length > 0 ? reprises : undefined,
        docType: "song",
        fileDbKey,
        filename,
      });
      setIsEdit(false);
      return;
    }

    const data: Partial<Song> = {
      docType: "song",
      name,
      author,
      authorLyrics,
      authorArrange,
      category,
      reprises: reprises.length > 0 ? reprises : undefined,
    };
    if (selectedFile && typeof selectedFile !== "string") {
      data.file = selectedFile;
    }

    await editSong(song.doc._id, data);
    await recacheSong(params.id);
    setIsEdit(false);
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };
  const handleClosePreview = () => setIsPreviewModalOpen(false);

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
    setSelectedFile(null);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      // Здесь добавьте запрос на удаление песни
      if (!navigator.onLine) {
        enqueue({ type: "song.delete", id: song.doc._id });
        window.dispatchEvent(
          new CustomEvent("sw-delete-song", {
            detail: { id: song.doc._id, filename: song.doc.file?.filename },
          }),
        );
        router.push(`/playlist/${song.doc.category}`);
        return;
      }

      const response = await removeSong(song.doc._id);

      if (response) {
        window.dispatchEvent(
          new CustomEvent("sw-delete-song", {
            detail: { id: song.doc._id, filename: song.doc.file?.filename },
          }),
        );
        router.push(`/playlist/${song.doc.category}`);
        router.refresh();
      } else {
        console.error("Ошибка при удалении песни");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("Ошибка при удалении песни:", error);
      setIsDeleting(false);
    }
  };

  const fields = [
    { label: "Название", value: song.doc.name, required: true },
    { label: "Автор музыки", value: song.doc.author },
    { label: "Автор слов", value: song.doc.authorLyrics },
    { label: "Автор аранжировки", value: song.doc.authorArrange },
    {
      label: "Категория",
      value: getCategoryDisplay(song.doc.category, "full"),
      required: true,
    },
  ];

  return (
    <SongContextProvider songResponse={song}>
      <Card className="mt-8 border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row justify-between items-center px-8 py-6 bg-white border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 card-header">
              Детали партитуры
            </h2>
            <p className="text-gray-500 text-sm mt-1 input-header">
              Основная информация
            </p>
          </div>
          {isEdit && (
            <Button
              onPress={handleDeleteClick}
              className="button-edit-font px-5 py-2.5 rounded-lg bg-red-50 text-red-400 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
              Удалить
            </Button>
          )}
          {!isEdit && (
            <div className="flex items-center gap-6">
              <SongActions />
            </div>
          )}
          {session?.user?.role === "регент" && (
            <Button
              onPress={handleEdit}
              endContent={isEdit ? null : null}
              className={`button-edit-font px-5 py-2.5 rounded-lg  transition-all ${
                isEdit
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border"
                  : "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white hover:shadow-lg"
              }`}
            >
              {isEdit ? "✕ Отменить редактирование" : "Редактировать"}
            </Button>
          )}
        </CardHeader>

        <CardBody className="p-0">
          <div className="divide-y divide-gray-100 card-header">
            {fields.map((field, index) => {
              const getPlaceholder = (label: string) => {
                const placeholders: Record<string, string> = {
                  Название: "Введите название произведения",
                  "Автор музыки": "Введите автора музыки",
                  "Автор слов": "Введите автора слов",
                  "Автор аранжировки": "Введите автора аранжировки",
                  Категория: "Выберите категорию",
                };
                return placeholders[label] || `Введите ${label.toLowerCase()}`;
              };
              return (
                <div
                  key={index}
                  className="px-8 py-6 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="w-full md:w-1/3">
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="text-red-500 ml-1 input-header">
                          *
                        </span>
                      )}
                    </div>
                    <div className="w-full md:w-2/3">
                      {isEdit ? (
                        <InfoCardInput
                          placeholder={getPlaceholder(field.label)}
                          field={field}
                          category={category}
                          onChange={(value) => {
                            switch (field.label) {
                              case "Название":
                                setName(value);
                                break;
                              case "Автор музыки":
                                setAuthor(value);
                                break;
                              case "Автор слов":
                                setAuthorLyrics(value);
                                break;
                              case "Автор аранжировки":
                                setAuthorArrange(value);
                                break;
                              case "Категория":
                                setCategory(value);
                                break;
                              default:
                                break;
                            }
                          }}
                        />
                      ) : (
                        <p className="text-gray-800 text-lg font-medium card-header">
                          {field.value || (
                            <span className="text-gray-400 card-header">—</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Репризы в режиме просмотра */}
            {!isEdit && reprises.length > 0 && numPages !== 1 && (
              <div className="px-8 py-6 hover:bg-gray-50/50 transition-colors border-t border-gray-100">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="w-full md:w-1/3">
                    <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Репризы
                    </span>
                  </div>
                  <div className="w-full md:w-2/3 flex flex-col gap-1">
                    {reprises.map((r, i) => (
                      <p
                        key={i}
                        className="text-gray-800 text-lg font-medium card-header"
                      >
                        стр. {r.fromPage} → стр. {r.toPage}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {isEdit && (
            <>
              <div className="px-8 py-8 border-t border-gray-200 bg-gray-50/30">
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 card-header">
                    Обновить файл партитуры
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <p className="text-sm text-orange-700 input-header">
                        ⚠️ Текущий файл будет заменен
                      </p>
                    </div>
                    <MyDropzone
                      onFileSelect={handleFileSelect}
                      onPreview={handlePreview}
                      currentFile={{
                        name:
                          selectedFile && typeof selectedFile === "string"
                            ? song.doc.name
                            : selectedFile?.name || "",
                        size:
                          selectedFile && typeof selectedFile === "string"
                            ? song.doc.file?.size
                            : selectedFile?.size || 0,
                        id:
                          selectedFile && typeof selectedFile === "string"
                            ? song.doc._id
                            : null,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Репризы — только если файл содержит 2+ страниц */}
              {numPages !== 1 && (
                <div className="px-8 py-6 border-t border-gray-200 bg-gray-50/30">
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800 card-header">
                        Репризы
                      </h3>
                      <Button
                        size="sm"
                        variant="flat"
                        className="input-header text-[#7D5E42]"
                        onPress={() => {
                          setReprises((r) => [
                            ...r,
                            { fromPage: 0, toPage: 0 },
                          ]);
                          setRepriseRaw((r) => [...r, { from: "", to: "" }]);
                        }}
                      >
                        + Добавить
                      </Button>
                    </div>
                    {numPages > 0 && (
                      <p className="text-xs text-gray-400 input-header mb-2">
                        Страниц в файле: {numPages}
                      </p>
                    )}
                    {reprises.length === 0 ? (
                      <p className="text-sm text-gray-400 input-header">
                        Нет реприз. Нажмите «+ Добавить» чтобы указать переход
                        между страницами
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {reprises.map((r, i) => {
                          const rawFrom =
                            parseInt(repriseRaw[i]?.from || "0") || 0;
                          const rawTo = parseInt(repriseRaw[i]?.to || "0") || 0;
                          const isEmpty =
                            repriseRaw[i]?.from === "" ||
                            repriseRaw[i]?.to === "";
                          const isSamePage =
                            !isEmpty &&
                            rawFrom > 0 &&
                            rawTo > 0 &&
                            rawFrom === rawTo;
                          return (
                            <div key={i} className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-500 input-header whitespace-nowrap">
                                  На стр.
                                </span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  size="sm"
                                  value={
                                    repriseRaw[i]?.from ?? String(r.fromPage)
                                  }
                                  isInvalid={
                                    isSamePage ||
                                    (saveAttempted &&
                                      repriseRaw[i]?.from === "")
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    setRepriseRaw((prev) =>
                                      prev.map((x, j) =>
                                        j === i ? { ...x, from: raw } : x,
                                      ),
                                    );
                                  }}
                                  onBlur={() => {
                                    const raw = repriseRaw[i]?.from;
                                    if (!raw) return;
                                    const clamped =
                                      numPages > 0
                                        ? Math.min(
                                            numPages,
                                            Math.max(1, parseInt(raw) || 1),
                                          )
                                        : Math.max(1, parseInt(raw) || 1);
                                    setRepriseRaw((prev) =>
                                      prev.map((x, j) =>
                                        j === i
                                          ? { ...x, from: String(clamped) }
                                          : x,
                                      ),
                                    );
                                    setReprises((prev) =>
                                      prev.map((x, j) =>
                                        j === i
                                          ? { ...x, fromPage: clamped }
                                          : x,
                                      ),
                                    );
                                  }}
                                  classNames={{
                                    input:
                                      "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                  }}
                                  className="input-header w-20"
                                />
                                <span className="text-xs text-gray-500 input-header whitespace-nowrap">
                                  → перейти на стр.
                                </span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  size="sm"
                                  value={repriseRaw[i]?.to ?? String(r.toPage)}
                                  isInvalid={
                                    isSamePage ||
                                    (saveAttempted && repriseRaw[i]?.to === "")
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    setRepriseRaw((prev) =>
                                      prev.map((x, j) =>
                                        j === i ? { ...x, to: raw } : x,
                                      ),
                                    );
                                  }}
                                  onBlur={() => {
                                    const raw = repriseRaw[i]?.to;
                                    if (!raw) return;
                                    const clamped =
                                      numPages > 0
                                        ? Math.min(
                                            numPages,
                                            Math.max(1, parseInt(raw) || 1),
                                          )
                                        : Math.max(1, parseInt(raw) || 1);
                                    setRepriseRaw((prev) =>
                                      prev.map((x, j) =>
                                        j === i
                                          ? { ...x, to: String(clamped) }
                                          : x,
                                      ),
                                    );
                                    setReprises((prev) =>
                                      prev.map((x, j) =>
                                        j === i ? { ...x, toPage: clamped } : x,
                                      ),
                                    );
                                  }}
                                  classNames={{
                                    input:
                                      "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                  }}
                                  className="input-header w-20"
                                />
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  className="text-danger min-w-unit-8 w-8 h-8"
                                  onPress={() => {
                                    setReprises((prev) =>
                                      prev.filter((_, j) => j !== i),
                                    );
                                    setRepriseRaw((prev) =>
                                      prev.filter((_, j) => j !== i),
                                    );
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
                  </div>
                </div>
              )}

              <div className="px-8 py-6 bg-gray-50 border-t">
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onPress={handleSave}
                    isDisabled={
                      repriseRaw.some((r) => r.from === "" || r.to === "") ||
                      reprises.some((r) => r.fromPage === r.toPage)
                    }
                    className="px-5 py-2.5 rounded-lg border button-safe-font bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white-400  hover:opacity-90 transition-all"
                  >
                    Сохранить
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <ModalFilePreviewer
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        selectedFile={selectedFile}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col items-center text-center gap-2">
                <h3 className="text-2xl font-bold text-gray-900">
                  Удалить партитуру
                </h3>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Вы уверены, что хотите удалить партитуру
                    <br />
                    <span className="font-semibold text-gray-900 ml-1">
                      "{song.doc.name}"
                    </span>
                    ?
                  </p>
                  <div className="p-5 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200 shadow-sm">
                    <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                      <span className="text-red-500 text-base">⚠️</span>
                      Это действие невозможно отменить
                    </p>
                    <p className="text-sm text-red-700 mt-2">
                      Будет удалена вся информация, включая файл партитуры
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={onClose}
                  className="px-6 py-3 font-medium"
                  disabled={isDeleting}
                >
                  Отмена
                </Button>
                <Button
                  onPress={handleConfirmDelete}
                  className="px-6 py-3 bg-gradient-to-r from-red-400 to-red-500 text-white font-medium hover:shadow-lg transition-all"
                  isLoading={isDeleting}
                >
                  {isDeleting ? "Удаление..." : "Да, удалить"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </SongContextProvider>
  );
};
