import React, { useState, useImperativeHandle, forwardRef } from "react";
import ReactDOM from "react-dom/client";
import { toPng } from "html-to-image";

const FONT_FAMILY = "Roboto Slab, serif";
const FONT_COLOR = "#2B2B2B";
const TITLE_COLOR = "#7D5E42";
const AUTHOR_COLOR = "#8A8A8A";
const LINE_HEIGHT = 1.35;

type ProgramDownloadProps = {
  backgroundUrl: string;
  programText: string;
  width?: number;
  height?: number;
  onDownload?: (blob: Blob) => void;
  downloadHandler?: () => void;
};

type SongItem = { song: string; authors: string[] };

type ParsedSection = {
  title: string;
  songsWithAuthors: SongItem[];
};

type ProgramDownloadContentProps = {
  sections: ParsedSection[];
  songFontSize: number;
  authorFontSize: number;
  dynamicTitleFontSize: number;
  songMarginPx: number;
  sectionGapPx: number;
  numColumns: number;
  bgImageSrc: string;
  bgTop: number;
  bgLeft: number;
  bgWidth: number;
  bgHeight: number;
  width: number;
  height: number;
  paddingX: number;
  textTop: number;
  textBottom: number;
};

// Парсим строки секции в список песен с авторами
function parseSongsFromLines(lines: string[]): SongItem[] {
  const result: SongItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\d+\./.test(line.trim())) {
      const authors: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (
          nextLine.trim().startsWith("сл.") ||
          nextLine.trim().startsWith("муз.") ||
          nextLine.trim().startsWith("аранж.")
        ) {
          if (nextLine.trim().startsWith("аранж.") && authors.length > 0) {
            authors[authors.length - 1] += ", " + nextLine.trim();
          } else {
            authors.push(nextLine.trim());
          }
          j++;
        } else break;
      }
      result.push({ song: line, authors });
      i = j - 1;
    }
  }
  return result;
}

// Оцениваем количество строк для текста в колонке заданной ширины
function estimateLineCount(
  text: string,
  columnWidthPx: number,
  fontSizePx: number,
): number {
  // Roboto Slab Bold кириллица — символы широкие, ≈ 0.7 от размера шрифта
  const avgCharWidth = fontSizePx * 0.7;
  const charsPerLine = Math.max(1, Math.floor(columnWidthPx / avgCharWidth));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

// Маленькая программа (≤12 песен) → 1 колонка, большая → 2
const SINGLE_COLUMN_THRESHOLD = 12;

// Заголовок всегда крупнее текста песен, но не больше 130px
function calcTitleFontSize(songFontSize: number): number {
  return Math.min(130, songFontSize * 1.5);
}

// Высота одной песни (название + авторы + внешний marginBottom контейнера)
function calcItemHeight(
  item: SongItem,
  songFontSize: number,
  authorFontSize: number,
  columnWidth: number,
  marginPx: number,
): number {
  let h = 0;
  const songLines = estimateLineCount(item.song, columnWidth, songFontSize);
  h += songFontSize * LINE_HEIGHT * songLines + marginPx; // заголовок + его margin
  for (const author of item.authors) {
    const authorLines = estimateLineCount(author, columnWidth, authorFontSize);
    h += authorFontSize * LINE_HEIGHT * authorLines + marginPx; // автор + его margin
  }
  h += marginPx; // внешний marginBottom контейнера песни
  return h;
}

// Оцениваем суммарную высоту контента для заданного размера шрифта
function estimateContentHeight(
  sections: ParsedSection[],
  songFontSize: number,
  totalSongCount: number,
  availableWidth: number,
): number {
  const authorFontSize = songFontSize * 0.8;
  const titleFontSize = calcTitleFontSize(songFontSize);
  const marginPx =
    0.5 * Math.min(1, 12 / Math.max(totalSongCount, 1)) * songFontSize;
  const numColumns = totalSongCount <= SINGLE_COLUMN_THRESHOLD ? 1 : 2;
  // 48% ширины контейнера на каждую колонку (space-between распределяет оставшиеся 4%)
  const columnWidth = numColumns === 1 ? availableWidth : availableWidth * 0.48;
  const sectionGapPx = Math.max(40, songFontSize * 1.2);

  let totalHeight = 0;

  for (const { songsWithAuthors } of sections) {
    // Высота заголовка: сам текст + marginBottom (0.8 * LINE_HEIGHT * titleFontSize)
    totalHeight +=
      titleFontSize * LINE_HEIGHT + titleFontSize * LINE_HEIGHT * 0.8;

    if (songsWithAuthors.length === 0) continue;

    if (numColumns === 1) {
      // Одна колонка — все песни по вертикали
      for (const item of songsWithAuthors) {
        totalHeight += calcItemHeight(
          item,
          songFontSize,
          authorFontSize,
          columnWidth,
          marginPx,
        );
      }
    } else {
      // Две колонки: нумерация СВЕРХУ ВНИЗ — левый столбец (1..n/2), правый (n/2+1..n)
      const half = Math.ceil(songsWithAuthors.length / 2);
      const leftItems = songsWithAuthors.slice(0, half);
      const rightItems = songsWithAuthors.slice(half);
      let leftTotal = 0;
      for (const item of leftItems) {
        leftTotal += calcItemHeight(item, songFontSize, authorFontSize, columnWidth, marginPx);
      }
      let rightTotal = 0;
      for (const item of rightItems) {
        rightTotal += calcItemHeight(item, songFontSize, authorFontSize, columnWidth, marginPx);
      }
      totalHeight += Math.max(leftTotal, rightTotal);
    }

    totalHeight += sectionGapPx;
  }

  return totalHeight;
}

// Бинарный поиск оптимального размера шрифта
function findOptimalFontSize(
  sections: ParsedSection[],
  totalSongCount: number,
  availableWidth: number,
  availableHeight: number,
): number {
  const targetHeight = availableHeight * 0.96;
  let lo = 20;
  let hi = 130;
  let best = lo;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (
      estimateContentHeight(sections, mid, totalSongCount, availableWidth) <=
      targetHeight
    ) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

const ProgramDownloadContent: React.FC<ProgramDownloadContentProps> = ({
  sections,
  songFontSize,
  authorFontSize,
  dynamicTitleFontSize,
  songMarginPx,
  sectionGapPx,
  numColumns,
  bgImageSrc,
  bgTop,
  bgLeft,
  bgWidth,
  bgHeight,
  width,
  height,
  paddingX,
  textTop,
  textBottom,
}) => {
  return (
    <div
      style={{
        width,
        height,
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
          top: textTop,
          left: paddingX,
          right: paddingX,
          bottom: textBottom,
          color: FONT_COLOR,
          overflow: "hidden",
        }}
      >
        {sections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            style={{
              display: "flex",
              flexDirection: "column",
              marginBottom: sectionGapPx,
            }}
          >
            {/* Заголовок секции с декоративными линиями */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 30,
                marginBottom: dynamicTitleFontSize * LINE_HEIGHT * 0.8,
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
                {section.title.replace(/:/g, "").trim()}
              </div>
              <div
                style={{
                  width: "25%",
                  height: "2px",
                  background: `linear-gradient(to right, ${TITLE_COLOR}AA, transparent)`,
                }}
              />
            </div>

            {/* Список песен */}
            {(() => {
              const songs = section.songsWithAuthors;
              const renderSongItem = (item: SongItem, index: number) => (
                <div
                  key={index}
                  style={{
                    marginBottom: songMarginPx,
                    fontFamily: FONT_FAMILY,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      fontSize: songFontSize,
                      fontWeight: "bold",
                      marginBottom: songMarginPx,
                      lineHeight: LINE_HEIGHT,
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
                        marginBottom: songMarginPx,
                        lineHeight: LINE_HEIGHT,
                        color: AUTHOR_COLOR,
                        fontFamily: FONT_FAMILY,
                      }}
                    >
                      {author}
                    </div>
                  ))}
                </div>
              );

              if (numColumns === 1) {
                // 1 колонка — центрированный блок
                return (
                  <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                    <div style={{ width: "80%", textAlign: "left" }}>
                      {songs.map((item, i) => renderSongItem(item, i))}
                    </div>
                  </div>
                );
              } else {
                // 2 колонки — нумерация сверху вниз
                const half = Math.ceil(songs.length / 2);
                const leftCol = songs.slice(0, half);
                const rightCol = songs.slice(half);
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ width: "48%" }}>
                      {leftCol.map((item, i) => renderSongItem(item, i))}
                    </div>
                    <div style={{ width: "48%" }}>
                      {rightCol.map((item, i) => renderSongItem(item, i))}
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        ))}
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

        // Загружаем шрифт (variable font поддерживает все веса 100-900)
        const robotoSlab = new FontFace(
          "Roboto Slab",
          "url(/fonts/RobotoSlab-VariableFont_wght.ttf)",
          { weight: "1 900" },
        );
        try {
          await robotoSlab.load();
          document.fonts.add(robotoSlab);
          await document.fonts.ready;
          console.log("✅ Шрифт загружен");
        } catch (error) {
          console.warn("⚠️ Шрифт не загрузился", error);
        }

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

        // Разбираем текст на секции
        const rawLines = programText.split("\n").filter(Boolean);
        const rawSections: { title: string; lines: string[] }[] = [];
        let currentRawSection: { title: string; lines: string[] } | null = null;

        rawLines.forEach((line) => {
          const lowerLine = line.toLowerCase();
          if (
            lowerLine.startsWith("программа") ||
            lowerLine.startsWith("резерв")
          ) {
            currentRawSection = { title: line, lines: [] };
            rawSections.push(currentRawSection);
          } else if (currentRawSection) {
            currentRawSection.lines.push(line);
          }
        });

        // Парсим песни для каждой секции
        const parsedSections: ParsedSection[] = rawSections.map((s) => ({
          title: s.title,
          songsWithAuthors: parseSongsFromLines(s.lines),
        }));

        const totalSongCount = parsedSections.reduce(
          (sum, s) => sum + s.songsWithAuthors.length,
          0,
        );

        console.log(
          `📋 Секций: ${parsedSections.length}, всего песен: ${totalSongCount}`,
        );

        // Параметры холста
        // Минимальные отступы от угловых узоров фона
        const paddingX = 200;
        const ornamentPadding = 180; // минимум от края до текста (за узорами)
        const availableWidth = width - 2 * paddingX;
        const maxAvailableHeight = height - 2 * ornamentPadding;

        // Бинарный поиск оптимального размера шрифта
        const songFontSize = findOptimalFontSize(
          parsedSections,
          totalSongCount,
          availableWidth,
          maxAvailableHeight,
        );

        const authorFontSize = songFontSize * 0.8;
        const dynamicTitleFontSize = calcTitleFontSize(songFontSize);
        const songMarginPx =
          0.5 * Math.min(1, 12 / Math.max(totalSongCount, 1)) * songFontSize;
        const numColumns = totalSongCount <= SINGLE_COLUMN_THRESHOLD ? 1 : 2;
        const sectionGapPx = Math.max(40, songFontSize * 1.2);

        // Вертикальное центрирование: вычисляем реальную высоту контента
        const contentHeight = estimateContentHeight(
          parsedSections,
          songFontSize,
          totalSongCount,
          availableWidth,
        );
        const verticalPad = Math.max(
          ornamentPadding,
          Math.floor((height - contentHeight) / 2),
        );
        const textTop = verticalPad;
        const textBottom = verticalPad;

        console.log(
          `📏 Шрифт: ${songFontSize}px, заголовок: ${dynamicTitleFontSize}px, колонок: ${numColumns}, отступ сверху: ${textTop}px`,
        );

        // Рассчитываем позицию фона в режиме cover
        const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
        const containerRatio = width / height;
        let bgWidth, bgHeight, bgLeft, bgTop;

        if (imgRatio > containerRatio) {
          bgHeight = height;
          bgWidth = height * imgRatio;
          bgLeft = (width - bgWidth) / 2;
          bgTop = 0;
        } else {
          bgWidth = width;
          bgHeight = width / imgRatio;
          bgLeft = 0;
          bgTop = (height - bgHeight) / 2;
        }

        // Создаём временный контейнер
        const tempContainer = document.createElement("div");
        tempContainer.style.cssText = `
          position: fixed; top: 0; left: 0;
          width: ${width}px; height: ${height}px;
          z-index: 9999; opacity: 0; pointer-events: none;
          overflow: hidden; box-sizing: border-box;
          background: white; font-family: ${FONT_FAMILY};
        `;
        tempContainer.setAttribute("aria-hidden", "true");
        document.body.appendChild(tempContainer);

        const tempContainerInner = document.createElement("div");
        tempContainerInner.style.cssText = `
          font-family: ${FONT_FAMILY}; width: ${width}px; height: ${height}px;
          margin: 0; padding: 0; background: white; box-sizing: border-box;
          position: relative;
        `;
        tempContainer.appendChild(tempContainerInner);

        // Рендерим компонент
        const root = ReactDOM.createRoot(tempContainerInner);
        root.render(
          <ProgramDownloadContent
            sections={parsedSections}
            songFontSize={songFontSize}
            authorFontSize={authorFontSize}
            dynamicTitleFontSize={dynamicTitleFontSize}
            songMarginPx={songMarginPx}
            sectionGapPx={sectionGapPx}
            numColumns={numColumns}
            bgImageSrc={bgImage.src}
            bgTop={bgTop}
            bgLeft={bgLeft}
            bgWidth={bgWidth}
            bgHeight={bgHeight}
            width={width}
            height={height}
            paddingX={paddingX}
            textTop={textTop}
            textBottom={textBottom}
          />,
        );

        // Ждём загрузки изображения и шрифтов
        await new Promise<void>((resolve) => {
          const img = tempContainerInner.querySelector("img");
          if (img && img.complete) resolve();
          else if (img) {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          } else setTimeout(resolve, 200);
        });
        await document.fonts.ready;
        await new Promise((resolve) => setTimeout(resolve, 300));

        console.log("🖼️ Конвертируем в PNG...");

        const dataUrl = await toPng(tempContainerInner as HTMLElement, {
          cacheBust: true,
          pixelRatio: 3,
          width,
          height,
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
          },
          filter: () => true,
        });

        // Финальная отрисовка через canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Не удалось получить контекст canvas");

        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.src = dataUrl;
        });

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((result) => resolve(result), "image/png", 1.0);
        });
        if (!blob) throw new Error("Не удалось создать blob");

        console.log(
          `💾 Размер файла: ${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Программа.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (onDownload) onDownload(blob);

        console.log(`🎉 Готово: ${width}×${height}px`);
      } catch (error) {
        console.error("❌ Ошибка:", error);
        alert("Не удалось создать изображение. Попробуйте снова.");
      } finally {
        document.querySelectorAll('[style*="z-index: 9999"]').forEach((el) => {
          el.parentNode?.removeChild(el);
        });
        setIsLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({ handleDownload }));

    return null;
  },
);

export default ProgramDownload;
