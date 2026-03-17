import React, { useState, useImperativeHandle, forwardRef } from "react";
import ReactDOM from "react-dom/client";
import { toPng } from "html-to-image";

const FONT_FAMILY = "Roboto Slab, serif";
const FONT_COLOR = "#2B2B2B";
const TITLE_COLOR = "#7D5E42";
const AUTHOR_COLOR = "#8A8A8A";

type ProgramDownloadProps = {
  backgroundUrl: string;
  programText: string;
  width?: number;
  height?: number;
  onDownload?: (blob: Blob) => void;
  downloadHandler?: () => void; // добавляем проп
};

type Section = {
  title: string;
  lines: string[];
};

type ProgramDownloadContentProps = {
  sections: Section[];
  songFontSize: number;
  authorFontSize: number;
  dynamicTitleFontSize: number;
  songMargin: string;
  bgImageSrc: string;
  bgTop: number;
  bgLeft: number;
  bgWidth: number;
  bgHeight: number;
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
};

const ProgramDownloadContent: React.FC<ProgramDownloadContentProps> = ({
  sections,
  songFontSize,
  authorFontSize,
  dynamicTitleFontSize,
  songMargin,
  bgImageSrc,
  bgTop,
  bgLeft,
  bgWidth,
  bgHeight,
  width,
  height,
  paddingX,
  paddingY,
}) => {
  return (
    <div
      style={{
        width: width,
        height: height,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "white",
        boxSizing: "border-box",
        fontFamily: FONT_FAMILY,
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* Фоновое изображение */}
      <img
        src={bgImageSrc}
        alt="background"
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          top: bgTop,
          left: bgLeft,
          width: bgWidth,
          height: bgHeight,
          objectFit: "cover",
          margin: 0,
          padding: 0,
        }}
      />

      {/* Текстовый слой */}
      <div
        style={{
          position: "absolute",
          top: paddingY - 120,
          left: paddingX,
          right: paddingX,
          bottom: paddingY + 20,
          color: FONT_COLOR,
          margin: 0,
          padding: 0,
        }}
      >
        {sections.map((section, sectionIndex) => {
          // Группируем песни с авторами
          const allLines = section.lines;
          const songsWithAuthors: { song: string; authors: string[] }[] = [];

          for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            if (/^\d+\./.test(line.trim())) {
              const authors: string[] = [];
              let j = i + 1;
              while (j < allLines.length) {
                const nextLine = allLines[j];
                if (
                  nextLine.trim().startsWith("сл.") ||
                  nextLine.trim().startsWith("муз.") ||
                  nextLine.trim().startsWith("аранж.")
                ) {
                  let formattedLine = nextLine.trim();
                  if (formattedLine.startsWith("аранж.")) {
                    if (authors.length > 0) {
                      // Объединяем с предыдущим автором через запятую
                      authors[authors.length - 1] =
                        authors[authors.length - 1] + ", " + formattedLine;
                      j++;
                      continue;
                    }
                  }
                  authors.push(formattedLine);
                  j++;
                } else break;
              }
              songsWithAuthors.push({ song: line, authors });
              i = j - 1;
            }
          }

          return (
            <div
              key={sectionIndex}
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: "3em",
              }}
            >
              {/* Заголовок секции с линиями */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "3em",
                  marginBottom: dynamicTitleFontSize * 1.35 * 1.2,
                }}
              >
                <div
                  style={{
                    width: "25%",
                    height: "2px",
                    background: `linear-gradient(to left, ${TITLE_COLOR}AA, transparent)`,
                  }}
                />
                <div
                  style={{
                    fontSize: dynamicTitleFontSize,
                    fontWeight: "bold",
                    textAlign: "center",
                    color: TITLE_COLOR,
                    whiteSpace: "nowrap",
                    fontFamily: FONT_FAMILY,
                  }}
                >
                  {section.title}
                </div>
                <div
                  style={{
                    width: "25%",
                    height: "2px",
                    background: `linear-gradient(to right, ${TITLE_COLOR}AA, transparent)`,
                  }}
                />
              </div>

              {/* Контейнер песен секции */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4%",
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                {songsWithAuthors.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      width: "48%",
                      breakInside: "avoid",
                      marginBottom: songMargin,
                      fontFamily: FONT_FAMILY,
                    }}
                  >
                    <div
                      style={{
                        fontSize: songFontSize,
                        fontWeight: "bold",
                        marginBottom: songMargin,
                        lineHeight: 1.35,
                        fontFamily: FONT_FAMILY,
                      }}
                    >
                      {item.song}
                    </div>
                    {item.authors.map((author, aIndex) => (
                      <div
                        key={aIndex}
                        style={{
                          fontSize: authorFontSize,
                          marginBottom: songMargin,
                          lineHeight: 1.35,
                          color: AUTHOR_COLOR,
                          fontFamily: FONT_FAMILY,
                        }}
                      >
                        {author}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProgramDownload = forwardRef<
  { handleDownload: () => Promise<void> },
  ProgramDownloadProps
>(
  (
    { backgroundUrl, programText, width = 2480, height = 3508, onDownload },
    ref,
  ) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
      if (isLoading) return;

      setIsLoading(true);

      try {
        console.log(`🎬 Начинаем создание PNG ${width}×${height}...`);

        // Загружаем шрифт
        const robotoSlab = new FontFace(
          "Roboto Slab",
          "url(/fonts/RobotoSlab-VariableFont_wght.ttf)",
        );

        try {
          await robotoSlab.load();
          document.fonts.add(robotoSlab);
          await document.fonts.ready;
          console.log("✅ Шрифт загружен");
        } catch (error) {
          console.warn("⚠️ Шрифт не загрузился", error);
        }

        // Создаем временный контейнер
        const tempContainer = document.createElement("div");
        tempContainer.style.position = "fixed";
        tempContainer.style.top = "0";
        tempContainer.style.left = "0";
        tempContainer.style.width = `${width}px`;
        tempContainer.style.height = `${height}px`;
        tempContainer.style.zIndex = "9999";
        tempContainer.style.opacity = "0";
        tempContainer.style.pointerEvents = "none";
        tempContainer.style.overflow = "hidden";
        tempContainer.style.boxSizing = "border-box";
        tempContainer.style.backgroundColor = "white";
        // isolate styles for html-to-image
        tempContainer.style.fontFamily = FONT_FAMILY;
        tempContainer.style.fontWeight = "bold";
        tempContainer.setAttribute("aria-hidden", "true");

        document.body.appendChild(tempContainer);

        // Загружаем фоновое изображение
        const bgImage = new Image();
        bgImage.crossOrigin = "anonymous";
        bgImage.src = backgroundUrl;

        await new Promise<void>((resolve, reject) => {
          bgImage.onload = () => {
            console.log(
              `✅ Фон загружен: ${bgImage.naturalWidth}×${bgImage.naturalHeight}`,
            );
            resolve();
          };
          bgImage.onerror = reject;
        });

        // Разбиваем текст на строки
        const rawLines = programText.split("\n").filter(Boolean);
        const sections: { title: string; lines: string[] }[] = [];
        let currentSection: { title: string; lines: string[] } | null = null;

        rawLines.forEach((line) => {
          const lowerLine = line.toLowerCase();
          if (
            lowerLine.startsWith("программа") ||
            lowerLine.startsWith("резерв")
          ) {
            currentSection = { title: line, lines: [] };
            sections.push(currentSection);
          } else if (currentSection) {
            currentSection.lines.push(line);
          }
        });

        console.log(`📋 Найдено секций: ${sections.length}`);

        // Подсчет песен
        let maxSongCount = 0;
        sections.forEach((section) => {
          const songCount = section.lines.filter((l) =>
            /^\d+\./.test(l.trim()),
          ).length;
          if (songCount > maxSongCount) maxSongCount = songCount;
        });

        // Базовый размер шрифта
        const baseFontSize = 60;

        // Параметры для адаптивного масштабирования
        const minSongs = 5; // меньше или равно → шрифт максимальный
        const maxSongs = 20; // больше или равно → шрифт минимальный

        // Подсчет количества песен
        const totalSongCount = sections.reduce((total, section) => {
          return (
            total + section.lines.filter((l) => /^\d+\./.test(l.trim())).length
          );
        }, 0);

        // Коэффициент масштабирования в зависимости от количества песен
        const scalingFactor =
          totalSongCount <= minSongs
            ? 1.5 // увеличиваем на 50% если песен мало
            : totalSongCount >= maxSongs
              ? 0.8 // уменьшаем до 80% если очень много песен
              : 0.8 +
                ((maxSongs - totalSongCount) / (maxSongs - minSongs)) * 0.7; // линейно

        const finalFontSize = baseFontSize * scalingFactor;

        // Фиксированный размер заголовка
        const fixedTitleFontSize = 100; // фиксированный размер заголовка

        // Размеры для песен и автора (динамические), песня не больше заголовка
        const songFontSize = Math.min(finalFontSize, fixedTitleFontSize);
        const authorFontSize = songFontSize * 0.8;

        // Динамический размер заголовка (всегда больше текста, но не меньше songFontSize+5)
        const dynamicTitleFontSize = Math.max(
          songFontSize + 5,
          fixedTitleFontSize * scalingFactor,
        );

        // Динамический отступ между песнями и авторами
        const songMargin = 0.5 * Math.min(1, 12 / totalSongCount) + "em";

        // Определение двух колонок
        const useTwoColumns = totalSongCount >= 8;
        const lineHeight = 1.35;
        const paddingX = 180; // Увеличенные отступы для большого разрешения
        const paddingY = 280;
        const gapBetweenColumns = 100;

        // Рассчитываем фон в режиме COVER
        const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
        const containerRatio = width / height;

        let bgWidth, bgHeight, bgLeft, bgTop;

        if (imgRatio > containerRatio) {
          // Фон шире canvas: обрезаем по высоте (cover)
          bgHeight = height;
          bgWidth = height * imgRatio;
          bgLeft = (width - bgWidth) / 2;
          bgTop = 0;
        } else {
          // Фон выше canvas: обрезаем по ширине (cover)
          bgWidth = width;
          bgHeight = width / imgRatio;
          bgLeft = 0;
          bgTop = (height - bgHeight) / 2;
        }

        console.log(
          `📐 Позиция фона: x=${bgLeft}, y=${bgTop}, w=${bgWidth}, h=${bgHeight}`,
        );

        // Создаем внутренний контейнер с нужными стилями
        const tempContainerInner = document.createElement("div");
        tempContainerInner.style.fontFamily = FONT_FAMILY;
        tempContainerInner.style.fontWeight = "bold";
        tempContainerInner.style.width = `${width}px`;
        tempContainerInner.style.height = `${height}px`;
        tempContainerInner.style.margin = "0";
        tempContainerInner.style.padding = "0";
        tempContainerInner.style.backgroundColor = "white";
        tempContainerInner.style.boxSizing = "border-box";
        tempContainerInner.style.opacity = "1";
        tempContainerInner.style.position = "relative";
        // Ensure isolation
        tempContainer.appendChild(tempContainerInner);

        // Рендерим React компонент внутрь tempContainerInner
        const root = ReactDOM.createRoot(tempContainerInner);
        root.render(
          <ProgramDownloadContent
            sections={sections}
            songFontSize={songFontSize}
            authorFontSize={authorFontSize}
            dynamicTitleFontSize={dynamicTitleFontSize}
            songMargin={songMargin}
            bgImageSrc={bgImage.src}
            bgTop={bgTop}
            bgLeft={bgLeft}
            bgWidth={bgWidth}
            bgHeight={bgHeight}
            width={width}
            height={height}
            paddingX={paddingX}
            paddingY={paddingY}
          />,
        );

        // Ждем загрузки изображения и рендера React
        await new Promise<void>((resolve) => {
          const img = tempContainerInner.querySelector("img");
          if (img && img.complete) {
            resolve();
          } else if (img) {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          } else {
            setTimeout(resolve, 200);
          }
        });

        // Ждем загрузки всех шрифтов после монтирования
        await document.fonts.ready;

        // Даем время на отрисовку
        await new Promise((resolve) => setTimeout(resolve, 200));

        console.log("🖼️ Конвертируем в PNG с высоким качеством...");

        // КОНВЕРТИРУЕМ с увеличенным pixelRatio для максимального качества
        const pixelRatio = 3; // Еще больше для 2480×3508
        const dataUrl = await toPng(tempContainerInner as HTMLElement, {
          cacheBust: true,
          pixelRatio: pixelRatio,
          width: width,
          height: height,
          quality: 1,
          backgroundColor: "#ffffff",
          skipFonts: false,
          style: {
            margin: "0",
            padding: "0",
            transform: "none",
            width: `${width}px`,
            height: `${height}px`,
            fontFamily: FONT_FAMILY,
            fontWeight: "bold",
          },
          filter: (node) => {
            // Пропускаем все элементы
            return true;
          },
        });

        console.log("✅ PNG создан, преобразуем в Blob...");

        // Создаем canvas для финальной обработки
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Не удалось получить контекст canvas");

        // Устанавливаем ТОЧНОЕ разрешение
        canvas.width = width;
        canvas.height = height;

        // Загружаем изображение из dataUrl
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.src = dataUrl;
        });

        // Рисуем с высоким качеством
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Создаем Blob с максимальным качеством
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(
            (result) => resolve(result),
            "image/png",
            1.0, // Максимальное качество
          );
        });

        if (!blob) throw new Error("Не удалось создать blob");

        console.log(
          `💾 Blob создан: ${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        );

        // Скачиваем файл
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Программа.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (onDownload) {
          onDownload(blob);
        }

        console.log(
          `🎉 Изображение успешно создано: ${width}×${height} пикселей`,
        );
        console.log(
          `📁 Размер файла: ${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        );
      } catch (error) {
        console.error("❌ Ошибка при создании изображения:", error);
        alert("Не удалось создать изображение. Пожалуйста, попробуйте снова.");
      } finally {
        // Удаляем временные контейнеры
        const tempContainers = document.querySelectorAll(
          '[style*="z-index: 9999"]',
        );
        tempContainers.forEach((container) => {
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
        });
        setIsLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      handleDownload,
    }));

    return null;
  },
);

export default ProgramDownload;
