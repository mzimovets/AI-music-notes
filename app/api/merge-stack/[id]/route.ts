import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

// ─── Серверный кэш ────────────────────────────────────────────────────────────
type CacheEntry = { bytes: Uint8Array; songPages: string; name: string };
const pdfCache = new Map<string, CacheEntry>();
const PDF_CACHE_MAX = 20;

// Шрифт читается один раз и остаётся в памяти
let cachedFontBytes: Buffer | null = null;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";

// Соответствует app/stack/[id]/constants.ts
const MEAL_FILES_MAP: Record<string, { start: string; end: string }> = {
  daily:               { start: "daily-per.pdf",               end: "daily-pos.pdf" },
  rozhdestvo:          { start: "rozhdestvo-trop.pdf",         end: "rozhdestvo-kond.pdf" },
  kreshchenie:         { start: "kreshchenie-trop.pdf",        end: "kreshchenie-kond.pdf" },
  sretenie:            { start: "sretenie-trop.pdf",           end: "sretenie-kond.pdf" },
  blagoveshchenie:     { start: "blagoveshchenie-trop.pdf",    end: "blagoveshchenie-kond.pdf" },
  vhod:                { start: "vhod-trop.pdf",               end: "vhod-kond.pdf" },
  pascha:              { start: "pascha-trop.pdf",             end: "pascha-kond.pdf" },
  voznesenie:          { start: "voznesenie-trop.pdf",         end: "voznesenie-kond.pdf" },
  troica:              { start: "troica-trop.pdf",             end: "troica-kond.pdf" },
  preobrazhenie:       { start: "preobrazhenie-trop.pdf",      end: "preobrazhenie-kond.pdf" },
  uspenie:             { start: "uspenie-trop.pdf",            end: "uspenie-kond.pdf" },
  rozhdestvoBogorodicy:{ start: "rozhdestvoBogorodicy-trop.pdf", end: "rozhdestvoBogorodicy-kond.pdf" },
  vozdvizhenie:        { start: "vozdvizhenie-trop.pdf",       end: "vozdvizhenie-kond.pdf" },
  vvedenie:            { start: "vvedenie-trop.pdf",           end: "vvedenie-kond.pdf" },
};

// Цвета подобраны по доминирующему цвету PNG-обложек из /public/stacks/cover/
const COVER_COLORS: Record<string, [number, number, number]> = {
  blue:         [0.42, 0.55, 0.72], // приглушённый синий
  brown:        [0.55, 0.31, 0.13], // тёмно-коричневый
  "dark-purple":[0.29, 0.20, 0.28], // тёмно-фиолетовый
  green:        [0.30, 0.35, 0.10], // тёмно-оливковый
  grey:         [0.22, 0.21, 0.19], // почти чёрный
  ocean:        [0.13, 0.27, 0.38], // тёмно-синий морской
  orange:       [0.78, 0.38, 0.10], // оранжевый
  purple:       [0.52, 0.43, 0.65], // сиреневый
  red:          [0.47, 0.18, 0.15], // тёмно-бордовый
  salat:        [0.52, 0.62, 0.18], // жёлто-зелёный
  white:        [0.82, 0.80, 0.76], // бежево-серый
  yellow:       [0.73, 0.57, 0.10], // горчично-жёлтый
};

// Путь к public/meals-pdf относительно корня проекта
const MEALS_DIR  = path.join(process.cwd(), "public", "meals-pdf");
const FONT_PATH  = path.join(process.cwd(), "public", "fonts", "RobotoSlab-VariableFont_wght.ttf");

type OffsetEntry = {
  isReserve: boolean;
  pageOffset: number;
  pageCount: number;
  kind: "song" | "trapeza-start" | "trapeza-end";
};

async function appendPdfBytes(
  merged: PDFDocument,
  bytes: ArrayBuffer | Uint8Array | Buffer,
  offsets: OffsetEntry[],
  isReserve: boolean,
  kind: OffsetEntry["kind"],
  cursor: { value: number },
) {
  try {
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageCount = source.getPageCount();
    const copied = await merged.copyPages(source, source.getPageIndices());
    copied.forEach((p) => merged.addPage(p));
    offsets.push({ isReserve, pageOffset: cursor.value, pageCount, kind });
    cursor.value += pageCount;
  } catch (err) {
    console.warn("[merge-stack] Could not append PDF:", err);
  }
}

async function appendFromUrl(
  merged: PDFDocument,
  url: string,
  offsets: OffsetEntry[],
  isReserve: boolean,
  cursor: { value: number },
) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[merge-stack] HTTP ${res.status} for ${url}`);
      return;
    }
    const bytes = await res.arrayBuffer();
    await appendPdfBytes(merged, bytes, offsets, isReserve, "song", cursor);
  } catch (err) {
    console.warn(`[merge-stack] Could not fetch "${url}":`, err);
  }
}

async function appendFromDisk(
  merged: PDFDocument,
  filePath: string,
  offsets: OffsetEntry[],
  isReserve: boolean,
  kind: OffsetEntry["kind"],
  cursor: { value: number },
) {
  try {
    const bytes = await fs.readFile(filePath);
    await appendPdfBytes(merged, bytes, offsets, isReserve, kind, cursor);
  } catch (err) {
    console.warn(`[merge-stack] Could not read file "${filePath}":`, err);
  }
}

/** Добавляет пустую белую страницу A4 */
function addBlankPage(merged: PDFDocument, cursor: { value: number }) {
  merged.addPage([595, 842]);
  cursor.value += 1;
}

/** Добавляет цветную страницу раздела с названием по центру */
async function addSectionPage(
  merged: PDFDocument,
  cursor: { value: number },
  coverName: string,
  label: string,
) {
  const [r, g, b] = COVER_COLORS[coverName] ?? [1, 1, 1];
  const W = 595, H = 842;
  const page = merged.addPage([W, H]);

  // Заливка
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(r, g, b) });

  // Текст по центру белым (TTF с поддержкой кириллицы, шрифт кэшируется)
  if (!cachedFontBytes) cachedFontBytes = await fs.readFile(FONT_PATH);
  const font = await merged.embedFont(cachedFontBytes);
  const fontSize = 36;
  const textWidth = font.widthOfTextAtSize(label, fontSize);
  page.drawText(label, {
    x: (W - textWidth) / 2,
    y: H / 2 - fontSize / 3,
    size: fontSize,
    font,
    color: rgb(1, 1, 1),
    opacity: 0.90,
  });

  cursor.value += 1;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const v = req.nextUrl.searchParams.get("v") ?? "0";
  const cacheKey = `${id}:${v}`;

  // Отдаём из кэша если есть
  const cached = pdfCache.get(cacheKey);
  if (cached) {
    return new NextResponse(cached.bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(cached.name + ".pdf")}`,
        "Cache-Control": "no-store",
        "X-Song-Pages": cached.songPages,
        "Access-Control-Expose-Headers": "X-Song-Pages",
      },
    });
  }

  try {
    // 1. Fetch stack metadata
    const stackRes = await fetch(`${BACKEND_URL}/stack/${id}`, { cache: "no-store" });
    if (!stackRes.ok) {
      return NextResponse.json({ error: "Stack not found" }, { status: 404 });
    }
    const { doc: stack } = await stackRes.json();
    if (!stack) {
      return NextResponse.json({ error: "Stack not found" }, { status: 404 });
    }

    // 2. Build ordered song list
    const songs: any[]  = stack.songs || [];
    const mainSongs     = songs.filter((s: any) => !s.isReserve);
    const reserveSongs  = songs.filter((s: any) =>  s.isReserve);

    // 3. Determine meal files (хранятся в public/meals-pdf на Next.js сервере)
    const hasTrapeza = (stack.programSelected || []).includes("Трапеза");
    const mealEntry  = hasTrapeza && stack.mealType ? MEAL_FILES_MAP[stack.mealType] : null;

    // 4. Merge
    const merged  = await PDFDocument.create();
    merged.registerFontkit(fontkit);
    const offsets: OffsetEntry[] = [];
    // cursor начинается с 1 — обложек нет
    const cursor  = { value: 1 };

    const coverName = stack.cover && COVER_COLORS[stack.cover] ? stack.cover : null;

    // Выровнять на нечётную (левую) страницу белой заглушкой
    const alignToLeftPage = () => {
      if (cursor.value % 2 === 0) addBlankPage(merged, cursor);
    };

    // Выровнять на чётную (правую) страницу — слева добавляет страницу-разделитель
    const alignToRightPageWithSection = async (label: string) => {
      if (cursor.value % 2 !== 0) {
        if (coverName) await addSectionPage(merged, cursor, coverName, label);
        else addBlankPage(merged, cursor);
      }
    };

    // 4a. Тропарь — всегда на правой странице, слева страница с названием раздела
    if (mealEntry) {
      await alignToRightPageWithSection("Тропарь");
      await appendFromDisk(merged, path.join(MEALS_DIR, mealEntry.start), offsets, false, "trapeza-start", cursor);
    }

    // 4b. Основные песни — каждая начинается с левой страницы
    for (const song of mainSongs) {
      const filename = song?.file?.filename;
      if (!filename) continue;
      alignToLeftPage();
      await appendFromUrl(merged, `${BACKEND_URL}/uploads/${filename}`, offsets, false, cursor);
    }

    // 4c. Кондак — всегда на левой странице
    if (mealEntry) {
      alignToLeftPage();
      await appendFromDisk(merged, path.join(MEALS_DIR, mealEntry.end), offsets, false, "trapeza-end", cursor);
    }

    // 4d. Резерв — разделитель + каждая песня с левой страницы
    if (reserveSongs.length > 0) {
      // Страница-разделитель "Резерв" на левой, следующая страница — первая нота резерва
      alignToLeftPage();
      if (coverName) await addSectionPage(merged, cursor, coverName, "Резерв");
      else addBlankPage(merged, cursor);

      for (const song of reserveSongs) {
        const filename = song?.file?.filename;
        if (!filename) continue;
        alignToLeftPage();
        await appendFromUrl(merged, `${BACKEND_URL}/uploads/${filename}`, offsets, true, cursor);
      }
    }

    if (merged.getPageCount() === 0) {
      return NextResponse.json({ error: "No pages could be merged" }, { status: 422 });
    }

    // 6. Serialize, кэшируем и возвращаем
    const pdfBytes = await merged.save();

    // Сохраняем в кэш, вытесняем старые записи если кэш переполнен
    if (pdfCache.size >= PDF_CACHE_MAX) {
      pdfCache.delete(pdfCache.keys().next().value!);
    }
    pdfCache.set(cacheKey, {
      bytes: pdfBytes,
      songPages: JSON.stringify(offsets),
      name: stack.name || "stack",
    });

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent((stack.name || "stack") + ".pdf")}`,
        "Cache-Control": "no-store",
        "X-Song-Pages": JSON.stringify(offsets),
        "Access-Control-Expose-Headers": "X-Song-Pages",
      },
    });
  } catch (err: any) {
    console.error("[merge-stack] Unexpected error:", err?.message || err, err?.stack);
    return NextResponse.json(
      { error: "Failed to merge PDFs", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
