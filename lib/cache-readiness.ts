"use client";

/**
 * Честная проверка готовности к работе без связи.
 *
 * Смысл — не верить нашим же записям о том, что закешировано, а заглянуть в
 * настоящее хранилище кеша и сверить с тем, что сейчас на сервере. Записи могут
 * врать: кеширование прервали, браузер вытеснил файлы под нехватку места,
 * программу поправили после того, как её скачали. Всё это снаружи выглядит
 * одинаково — «вроде всё хорошо», — пока на выступлении не откроется лист.
 *
 * Устаревание определяем по дате в самом кешированном ответе: если запись
 * правили позже, чем страница попала в кеш, значит в кеше старая версия.
 * Отдельного учёта для этого не нужно, а врать такая проверка не может.
 */

import { getBackendBaseUrl, getUploadPath } from "./client-url";

const SNAPSHOT_KEY = "cache-readiness-snapshot-v1";

export type ItemState = "ok" | "missing" | "stale";

export interface ReadinessItem {
  id: string;
  title: string;
  kind: "stack" | "song";
  state: ItemState;
  /** Ноты без файла — отдельный случай: страница есть, а листа нет */
  fileMissing?: boolean;
}

export interface Readiness {
  checkedAt: number;
  /** Удалось ли спросить сервер. Без связи сверяем с последним известным списком */
  fresh: boolean;
  stacks: ReadinessItem[];
  songs: ReadinessItem[];
  /** Движок pdf.js и его декодеры — без них не откроется ни одна нота */
  engineOk: boolean;
  homeOk: boolean;
  ready: number;
  total: number;
}

interface Doc {
  id: string;
  title: string;
  updatedAt: number;
  filename?: string | null;
}

interface Snapshot {
  stacks: Doc[];
  songs: Doc[];
}

function extract(payload: any): any[] {
  return payload?.docs ?? (Array.isArray(payload) ? payload : []);
}

function toDoc(d: any, kind: "stack" | "song"): Doc | null {
  if (!d?._id) return null;
  return {
    id: d._id,
    title: d.name ?? d.title ?? (kind === "stack" ? "Программа" : "Нота"),
    updatedAt: Number(d.updatedAt) || 0,
    filename: d.file?.filename ?? null,
  };
}

function loadSnapshot(): Snapshot {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : { stacks: [], songs: [] };
  } catch {
    return { stacks: [], songs: [] };
  }
}

function saveSnapshot(snapshot: Snapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {}
}

/**
 * Когда этот адрес попал в кеш. null — его там нет вовсе.
 *
 * Дату берём из заголовка самого ответа: его положил сервер в момент выдачи.
 * Если заголовка нет, считаем время нулевым — тогда запись просто не будет
 * считаться устаревшей, но и присутствие в кеше подтвердится честно.
 */
async function cachedAt(url: string): Promise<number | null> {
  if (typeof caches === "undefined") return null;
  try {
    /**
     * ignoreVary обязателен. Next.js отдаёт страницы с заголовком Vary, где
     * перечислены служебные заголовки навигации, а хранилище кеша учитывает
     * его при поиске: простой запрос по адресу не совпадает с записью,
     * сохранённой вместе с этими заголовками. Без этого проверка объявляла
     * ненайденным почти всё, что на самом деле было скачано.
     */
    const res = await caches.match(url, { ignoreSearch: true, ignoreVary: true });
    if (!res) return null;
    const date = res.headers.get("date");
    return date ? Date.parse(date) || 0 : 0;
  } catch {
    return null;
  }
}

async function itemState(url: string, updatedAt: number): Promise<ItemState> {
  const at = await cachedAt(url);
  if (at === null) return "missing";
  // Запас в минуту: даты сервера и записи считаются по разным часам, и без
  // него свежескачанная страница иногда выглядела бы устаревшей
  if (updatedAt && at && updatedAt > at + 60_000) return "stale";
  return "ok";
}

const ENGINE_URLS = [
  "/api/pdf-worker",
  "/api/pdf-wasm/openjpeg.wasm",
  "/api/pdf-wasm/jbig2.wasm",
  "/api/pdf-wasm/qcms_bg.wasm",
];

export async function checkReadiness(): Promise<Readiness> {
  const backUrl = getBackendBaseUrl();

  let fresh = false;
  let snapshot = loadSnapshot();

  try {
    const [stacksRes, songsRes] = await Promise.all([
      fetch(`${backUrl}/stacks`, { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(4000) }),
      fetch(`${backUrl}/songs`, { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(4000) }),
    ]);
    if (stacksRes.ok && songsRes.ok) {
      const stacks = extract(await stacksRes.json())
        .map((d) => toDoc(d, "stack"))
        .filter(Boolean) as Doc[];
      const songs = extract(await songsRes.json())
        .map((d) => toDoc(d, "song"))
        .filter(Boolean) as Doc[];
      snapshot = { stacks, songs };
      saveSnapshot(snapshot);
      fresh = true;
    }
  } catch {
    // Связи нет — сверяем с последним известным списком. Это честно: мы не
    // знаем, не появилось ли на сервере что-то ещё, и так и напишем
  }

  const stacks: ReadinessItem[] = await Promise.all(
    snapshot.stacks.map(async (doc) => ({
      id: doc.id,
      title: doc.title,
      kind: "stack" as const,
      state: await itemState(`/stackView/${doc.id}`, doc.updatedAt),
    })),
  );

  const songs: ReadinessItem[] = await Promise.all(
    snapshot.songs.map(async (doc) => {
      const pageState = await itemState(`/songRead/${doc.id}`, doc.updatedAt);
      // Страница без листа бесполезна, поэтому отсутствие файла приравниваем
      // к отсутствию ноты целиком
      const fileMissing = doc.filename
        ? (await cachedAt(getUploadPath(doc.filename))) === null
        : false;
      return {
        id: doc.id,
        title: doc.title,
        kind: "song" as const,
        state: fileMissing && pageState === "ok" ? "missing" : pageState,
        fileMissing,
      };
    }),
  );

  const engineOk = (await Promise.all(ENGINE_URLS.map(cachedAt))).every((at) => at !== null);
  const homeOk = (await cachedAt("/")) !== null;

  const items = [...stacks, ...songs];
  const ready = items.filter((i) => i.state === "ok").length;
  // Движок и главная — такие же обязательные части, как страницы
  const total = items.length + 2;

  return {
    checkedAt: Date.now(),
    fresh,
    stacks,
    songs,
    engineOk,
    homeOk,
    ready: ready + (engineOk ? 1 : 0) + (homeOk ? 1 : 0),
    total,
  };
}

/**
 * Докачивает то, чего не хватает, — сам, не полагаясь ни на чьи записи.
 *
 * Обычный проход кеширования смотрит только на новые записи и сверяется с
 * собственным списком уже скачанного. Если файл пропал из хранилища или запись
 * поправили, для него ничего нового нет — и кнопка «догрузить» не делала
 * ничего. Здесь адреса берутся прямо из проверки и запрашиваются заново.
 *
 * Возвращает, сколько удалось починить.
 */
export async function repairReadiness(readiness: Readiness): Promise<number> {
  const snapshot = loadSnapshot();
  const byId = new Map(snapshot.songs.map((s) => [s.id, s]));

  const urls: string[] = [];

  for (const item of readiness.stacks) {
    if (item.state !== "ok") urls.push(`/stackView/${item.id}`, `/stack/${item.id}`);
  }
  for (const item of readiness.songs) {
    if (item.state === "ok") continue;
    urls.push(`/songRead/${item.id}`, `/song/${item.id}`);
    const filename = byId.get(item.id)?.filename;
    if (filename) urls.push(getUploadPath(filename));
  }
  if (!readiness.engineOk) urls.push(...ENGINE_URLS);
  if (!readiness.homeOk) urls.push("/");
  urls.push("/offline.html");

  let fixed = 0;
  // По шесть за раз: по одному это складывалось в минуты на сотнях адресов,
  // а без ограничения планшет захлёбывается
  const CONCURRENCY = 6;
  let index = 0;

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
      while (index < urls.length) {
        const url = urls[index++];
        try {
          // cache: "reload" — берём с сервера, а не из кеша браузера, иначе
          // устаревшая страница так и осталась бы устаревшей
          const res = await fetch(url, { credentials: "same-origin", cache: "reload" });
          if (res.ok) fixed++;
        } catch {}
      }
    }),
  );

  return fixed;
}

/** Всё ли на месте — коротко, для маленькой полосы на главной */
export function readinessPercent(r: Readiness | null): number {
  if (!r || r.total === 0) return 0;
  return Math.round((r.ready / r.total) * 100);
}
