"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Slider,
  addToast,
} from "@heroui/react";
import Cropper from "react-easy-crop";
import { Pattern } from "@/components/pattern";
import { GalleryIcon } from "@/components/icons/GalleryIcon";
import { cropToBlob, uploadCategoryImage, type CropArea } from "@/lib/crop-image";
import type { SongCategory } from "@/lib/categories-store";

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null — создание новой категории */
  category: SongCategory | null;
  /** Сколько песен в категории: при непустой удаление запрещено */
  songsCount: number;
  onSave: (item: SongCategory) => Promise<void>;
  onDelete?: (key: string) => Promise<void>;
  /** Занятые ключи — чтобы у новой категории ключ не совпал с существующим */
  existingKeys?: string[];
}

const translitMap: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

const makeKey = (name: string, taken: string[]) => {
  const base =
    name
      .toLowerCase()
      .split("")
      .map((char) => translitMap[char] ?? char)
      .join("")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "category";

  let key = base;
  let counter = 2;
  while (taken.includes(key)) {
    key = `${base}_${counter}`;
    counter += 1;
  }
  return key;
};

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  isOpen,
  onClose,
  category,
  songsCount,
  onSave,
  onDelete,
  existingKeys = [],
}) => {
  const isNew = category === null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [savedImage, setSavedImage] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [nameError, setNameError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(category?.name ?? "");
    setSavedImage(category?.image ?? "");
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setNameError(false);
    setImageError(false);
    setIsSaving(false);
  }, [isOpen, category]);

  // Выбранный файл живёт в blob-URL — освобождаем, чтобы не течь памятью
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setImageError(false);
    event.target.value = "";
  };

  const handleRemoveImage = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setSavedImage("");
    setCroppedArea(null);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    // Обе проверки до выхода — иначе пользователь исправит одно и получит второе
    const missingName = !trimmed;
    const missingImage = !hasImage;

    setNameError(missingName);
    setImageError(missingImage);
    if (missingName || missingImage) return;

    setIsSaving(true);
    try {
      let image = savedImage;

      if (imageSrc && croppedArea) {
        const blob = await cropToBlob(imageSrc, croppedArea);
        image = await uploadCategoryImage(blob);
      }

      await onSave({
        key: category?.key ?? makeKey(trimmed, existingKeys),
        name: trimmed,
        image,
      });
      onClose();
    } catch (error) {
      addToast({
        title: <span className="font-bold text-white">Не удалось сохранить</span>,
        description: (
          <span className="text-white">
            {error instanceof Error ? error.message : "Попробуйте ещё раз"}
          </span>
        ),
        timeout: 4000,
        classNames: { base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white" },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!category || !onDelete) return;
    setIsSaving(true);
    try {
      await onDelete(category.key);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Кадрирование ещё не завершилось — картинки для сохранения пока нет
  const hasImage = Boolean(savedImage) || Boolean(imageSrc && croppedArea);
  const canDelete = !isNew && songsCount === 0;

  return (
    <Modal
      isDismissable={false}
      size="md"
      isOpen={isOpen}
      backdrop="blur"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      classNames={{
        wrapper: "flex items-center justify-center",
        base: "shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl",
      }}
    >
      <ModalContent className="p-8 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl">
        <div className="absolute top-0 left-0 pt-2 pl-2 z-0 pointer-events-none">
          <Pattern width={86} height={80} className="opacity-80" />
        </div>

        <ModalHeader className="pt-0 justify-center font-header text-lg font-bold">
          {isNew ? "Новая категория" : "Категория"}
        </ModalHeader>

        <ModalBody className="gap-4">
          <div
            className={`relative w-full aspect-square rounded-xl overflow-hidden bg-black/10 ${
              imageError ? "ring-2 ring-red-500" : ""
            }`}
          >
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedArea(areaPixels)}
              />
            ) : savedImage ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Заменить картинку"
                className="w-full h-full block"
              >
                <img
                  src={savedImage}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Выберите картинку"
                className="w-full h-full flex items-center justify-center text-gray-400"
              >
                <GalleryIcon className="w-24 h-24" />
              </button>
            )}

            {(savedImage || imageSrc) && (
              <button
                type="button"
                onClick={handleRemoveImage}
                aria-label="Убрать картинку"
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-base leading-none"
              >
                ×
              </button>
            )}
          </div>

          {imageSrc && (
            <Slider
              size="sm"
              minValue={1}
              maxValue={3}
              step={0.05}
              value={zoom}
              onChange={(value) => setZoom(Array.isArray(value) ? value[0] : value)}
              aria-label="Масштаб"
              classNames={{ track: "bg-black/10" }}
            />
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />

          <Input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(false);
            }}
            placeholder="Введите название"
            label="Название"
            labelPlacement="outside"
            isRequired
            isInvalid={nameError}
            errorMessage={nameError ? "Введите название!" : ""}
            className="w-full input-header"
          />

          {!isNew && songsCount > 0 && (
            <p className="text-xs text-gray-500 text-center">
              В категории {songsCount}{" "}
              {songsCount === 1 ? "песня" : songsCount < 5 ? "песни" : "песен"} — сначала
              перенесите их, чтобы удалить
            </p>
          )}
        </ModalBody>

        <ModalFooter className="flex justify-between items-center gap-3 mt-2">
          {canDelete ? (
            <Button
              onPress={handleDelete}
              isDisabled={isSaving}
              className="input-header bg-white/70 text-red-600"
            >
              Удалить
            </Button>
          ) : (
            <span />
          )}

          <div className="flex gap-3">
            <Button onPress={onClose} className="input-header bg-white/70">
              Отмена
            </Button>
            <Button
              isLoading={isSaving}
              onPress={handleSave}
              className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-lg input-header"
            >
              Сохранить
            </Button>
          </div>
        </ModalFooter>

        <div className="absolute bottom-3 right-2 z-50 pointer-events-none">
          <Pattern
            width={86}
            height={76}
            className="scale-y-[-1] scale-x-[-1] opacity-80"
          />
        </div>
      </ModalContent>
    </Modal>
  );
};
