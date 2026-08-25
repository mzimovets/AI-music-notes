// scan-optimizer.js — общее ядро переделки тяжёлых сканов ABBYY.
//
// Сканы из ABBYY FineReader жмут страницы в JPEG2000/JBIG2 — эти форматы
// весят чуть меньше обычного JPEG, но распаковываются в разы медленнее
// (замерено: 8-10 раз). Для нот это плохой обмен: экономия на размере не
// стоит того, что нота листается заметно медленнее остальных. Разбор
// причины на конкретном файле — TODO.md, пункт 2.
//
// Используется и разовым скриптом для уже загруженных нот
// (scripts/optimize-scans.js), и самой загрузкой на сервере
// (routes/songs.js) — чтобы новые сканы не приносили ту же беду снова.
//
// Требует poppler-utils (pdfimages, pdftoppm, pdfinfo) и python3-pil.
// Их отсутствие не ломает загрузку ноты — просто ничего не переделывает.

import { execFile, execFileSync } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_SCRIPT = path.join(__dirname, "scripts", "optimize-scan.py");

// Кэшируем результат: проверять бинарники на каждой загрузке ноты незачем
let toolsAvailable = null;

export function checkTools() {
  if (toolsAvailable !== null) return toolsAvailable;
  try {
    execFileSync("pdfimages", ["-v"], { stdio: "ignore", timeout: 5000 });
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore", timeout: 5000 });
    execFileSync("python3", ["-c", "import PIL"], { stdio: "ignore", timeout: 5000 });
    toolsAvailable = true;
  } catch {
    toolsAvailable = false;
    console.warn(
      "[scan-optimizer] poppler-utils или python3-pil не найдены — тяжёлые сканы не переделываются. " +
        "Установить: sudo apt install poppler-utils python3-pil",
    );
  }
  return toolsAvailable;
}

/**
 * Колонка "enc" в pdfimages -list — формат сжатия конкретной картинки.
 *
 * Таймаут обязателен: на одном из файлов на плате poppler завис намертво на
 * "Invalid number of shared object groups" — без ограничения по времени это
 * останавливало весь пакетный прогон целиком без единой подсказки, на каком
 * файле.
 */
export function needsOptimization(pdfPath) {
  try {
    const out = execFileSync("pdfimages", ["-list", pdfPath], { encoding: "utf8", timeout: 20_000 });
    return /\bjpx\b|\bjbig2\b/.test(out);
  } catch {
    // Не смогли посмотреть (в том числе завис и был убит по таймауту) —
    // не трогаем то, чего не понимаем
    return false;
  }
}

export function getPageCount(pdfPath) {
  const out = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8", timeout: 20_000 });
  const m = out.match(/^Pages:\s+(\d+)/m);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Переделывает файл на месте, если он тяжёлый. Ничего не бросает — при
 * любой заминке (нет инструментов, неожиданный PDF, число страниц не
 * сошлось) просто оставляет файл как был.
 */
export async function optimizeIfNeeded(pdfPath) {
  if (!pdfPath.toLowerCase().endsWith(".pdf")) return { optimized: false };
  if (!checkTools()) return { optimized: false };
  if (!needsOptimization(pdfPath)) return { optimized: false };

  const tmpOut = `${pdfPath}.optimizing.pdf`;
  try {
    const originalPages = getPageCount(pdfPath);
    const { stdout } = await execFileAsync("python3", [PYTHON_SCRIPT, pdfPath, tmpOut], {
      timeout: 200_000,
    });
    const result = JSON.parse(stdout.trim().split("\n").pop());
    if (!result.ok) throw new Error(result.error || "неизвестная ошибка python-скрипта");

    const newPages = getPageCount(tmpOut);
    if (newPages !== originalPages) {
      throw new Error(`число страниц не сошлось: было ${originalPages}, стало ${newPages}`);
    }
    if (!result.newSize) throw new Error("получился пустой файл");

    fs.renameSync(tmpOut, pdfPath);
    console.log(
      `[scan-optimizer] Переделан ${path.basename(pdfPath)}: ` +
        `${(result.originalSize / 1024 / 1024).toFixed(1)} → ${(result.newSize / 1024 / 1024).toFixed(1)} МБ`,
    );
    return { optimized: true, originalSize: result.originalSize, newSize: result.newSize };
  } catch (e) {
    console.warn(`[scan-optimizer] Не удалось переделать ${path.basename(pdfPath)}:`, e.message);
    try {
      fs.unlinkSync(tmpOut);
    } catch {}
    return { optimized: false, error: e.message };
  }
}
