import { getBackendBaseUrl, getUploadPath } from "./client-url";

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Сторона итоговой картинки: карточка на главной не больше ~300px, 800 хватает с запасом. */
const OUTPUT_SIZE = 800;
const JPEG_QUALITY = 0.85;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Не удалось открыть картинку")));
    image.src = src;
  });

/**
 * Вырезает выбранную область и сжимает её.
 * Фото с телефона весит 3–5 МБ, на выходе получается 80–150 КБ —
 * это важно, потому что картинки попадают в офлайн-кэш и на Raspberry Pi.
 */
export const cropToBlob = async (imageSrc: string, area: CropArea): Promise<Blob> => {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Не удалось подготовить картинку");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Не удалось подготовить картинку"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
};

/** Загружает картинку на сервер и возвращает путь для сохранения в категории. */
export const uploadCategoryImage = async (blob: Blob): Promise<string> => {
  const formData = new FormData();
  formData.append("file", blob, `category-${Date.now()}.jpg`);
  formData.append("docType", "categoryImage");

  const res = await fetch(`${getBackendBaseUrl()}/api/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();

  if (data.status !== "ok" || !data.doc?.originalName) {
    throw new Error(data.message || "Не удалось загрузить картинку");
  }

  return getUploadPath(data.doc.originalName);
};
