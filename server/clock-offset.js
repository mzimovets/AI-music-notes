// clock-offset.js — насколько отстают/спешат часы этой платы относительно
// мастера. У Raspberry Pi нет батарейки часов, время сбрасывается при каждом
// выключении (см. TODO.md, пункт 3 и память project-board-clock-skew) — а
// даты в истории синхронизации должны быть настоящими, а не платиными.
//
// Отдельный файл, а не через sync-client.js/index.js — чтобы не тянуть сюда
// database и не создавать циклический импорт с push-remote.js (см. комментарий
// в начале push-remote.js: он уже один раз обходил эту же ловушку).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OFFSET_FILE = path.join(__dirname, "clock-offset.json");

/** Вызывать после каждой удачной синхронизации с мастером — masterTimestamp оттуда */
export function recordClockOffset(masterTimestamp) {
  const offsetMs = masterTimestamp - Date.now();
  try {
    fs.writeFileSync(OFFSET_FILE, JSON.stringify({ offsetMs }), "utf8");
  } catch {}
}

/** Настоящее время сейчас — с поправкой на разницу с мастером, если она уже известна */
export function correctedNow() {
  try {
    const { offsetMs } = JSON.parse(fs.readFileSync(OFFSET_FILE, "utf8"));
    if (typeof offsetMs === "number") return Date.now() + offsetMs;
  } catch {}
  return Date.now();
}
