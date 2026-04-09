import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

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

// Цвета обложек — совпадают с COVER_COLORS в DearFlipViewer.tsx
const COVER_COLORS: Record<string, string> = {
  blue:          "#4A90D9",
  brown:         "#8B5E3C",
  "dark-purple": "#5B2B8C",
  green:         "#3A8C5C",
  grey:          "#7A8A99",
  ocean:         "#1A7A9A",
  orange:        "#D9823A",
  purple:        "#7A4AB0",
  red:           "#C0392B",
  salat:         "#7AB040",
  white:         "#C8BEB5",
  yellow:        "#D4A843",
};
const DEFAULT_COVER_COLOR = "#BD9673";

function hexToRgbFraction(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

// Путь к public/meals-pdf относительно корня проекта
const MEALS_DIR = path.join(process.cwd(), "public", "meals-pdf");

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

/** Добавляет одну страницу-обложку заданного цвета */
function addCoverPage(merged: PDFDocument, hexColor: string) {
  const { r, g, b } = hexToRgbFraction(hexColor);
  const page = merged.addPage([595, 842]); // A4
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(r, g, b) });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

    // 4. Определяем цвет обложки
    const coverHex = COVER_COLORS[stack.cover || ""] || DEFAULT_COVER_COLOR;

    // 5. Merge
    const merged  = await PDFDocument.create();
    const offsets: OffsetEntry[] = [];
    // cursor начинается с 2 — страница 1 занята передней обложкой
    const cursor  = { value: 2 };

    // 5a. Передняя обложка (страница 1, "hard cover")
    addCoverPage(merged, coverHex);

    // 5b. Тропарь (начало трапезы)
    if (mealEntry) {
      await appendFromDisk(merged, path.join(MEALS_DIR, mealEntry.start), offsets, false, "trapeza-start", cursor);
    }

    // 5c. Основные песни
    for (const song of mainSongs) {
      const filename = song?.file?.filename;
      if (!filename) continue;
      await appendFromUrl(merged, `${BACKEND_URL}/uploads/${filename}`, offsets, false, cursor);
    }

    // 5d. Резерв
    for (const song of reserveSongs) {
      const filename = song?.file?.filename;
      if (!filename) continue;
      await appendFromUrl(merged, `${BACKEND_URL}/uploads/${filename}`, offsets, true, cursor);
    }

    // 5e. Кондак (конец трапезы)
    if (mealEntry) {
      await appendFromDisk(merged, path.join(MEALS_DIR, mealEntry.end), offsets, false, "trapeza-end", cursor);
    }

    // 5f. Задняя обложка (последняя страница)
    addCoverPage(merged, coverHex);

    if (merged.getPageCount() <= 2) {
      // Только обложки — нечего показывать
      return NextResponse.json({ error: "No pages could be merged" }, { status: 422 });
    }

    // 6. Serialize and return
    const pdfBytes = await merged.save();

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
