/**
 * План страниц программы.
 *
 * Раньше порядок страниц существовал только внутри склеенного PDF, который
 * сервер пересобирал заново на каждое изменение стопки. Здесь та же
 * последовательность считается как обычный массив: перестановка песни — это
 * пересчёт плана, без сети и без переразбора документов.
 *
 * Порядок обязан совпадать с app/api/merge-stack/[id]/route.ts страница в
 * страницу: к нему привязаны репризы, переходы из боковой панели и вся
 * навигация. Эндпоинт склейки остался для скачивания программы.
 */

export const MEAL_FILES_MAP: Record<string, { start: string; end: string }> = {
  daily: { start: "daily-per.pdf", end: "daily-pos.pdf" },
  rozhdestvo: { start: "rozhdestvo-trop.pdf", end: "rozhdestvo-kond.pdf" },
  kreshchenie: { start: "kreshchenie-trop.pdf", end: "kreshchenie-kond.pdf" },
  sretenie: { start: "sretenie-trop.pdf", end: "sretenie-kond.pdf" },
  blagoveshchenie: { start: "blagoveshchenie-trop.pdf", end: "blagoveshchenie-kond.pdf" },
  vhod: { start: "vhod-trop.pdf", end: "vhod-kond.pdf" },
  pascha: { start: "pascha-trop.pdf", end: "pascha-kond.pdf" },
  voznesenie: { start: "voznesenie-trop.pdf", end: "voznesenie-kond.pdf" },
  troica: { start: "troica-trop.pdf", end: "troica-kond.pdf" },
  preobrazhenie: { start: "preobrazhenie-trop.pdf", end: "preobrazhenie-kond.pdf" },
  uspenie: { start: "uspenie-trop.pdf", end: "uspenie-kond.pdf" },
  rozhdestvoBogorodicy: { start: "rozhdestvoBogorodicy-trop.pdf", end: "rozhdestvoBogorodicy-kond.pdf" },
  vozdvizhenie: { start: "vozdvizhenie-trop.pdf", end: "vozdvizhenie-kond.pdf" },
  vvedenie: { start: "vvedenie-trop.pdf", end: "vvedenie-kond.pdf" },
};

/** Те же цвета, что заливают страницу-разделитель в склейке. */
export const COVER_COLORS: Record<string, string> = {
  blue: "#6b8cb8",
  brown: "#8c4f21",
  "dark-purple": "#4a3347",
  green: "#4d591a",
  grey: "#383630",
  ocean: "#214561",
  orange: "#c76119",
  purple: "#856ea6",
  red: "#782e26",
  salat: "#859e2e",
  white: "#d1ccc2",
  yellow: "#ba921a",
};

export type PlanPage =
  /** Страница из документа: и ноты, и трапеза */
  | { kind: "doc"; url: string; pageInDoc: number; songId?: string }
  /** Пустая страница-заглушка для выравнивания разворота */
  | { kind: "blank" }
  /** Цветная страница раздела с подписью */
  | { kind: "section"; label: string; color: string };

export type PlanEntry = {
  isReserve: boolean;
  /** Номер первой страницы в плане, начиная с 1 */
  pageOffset: number;
  pageCount: number;
  kind: "song" | "trapeza-start" | "trapeza-end";
  songId?: string;
  reprises?: { fromPage: number; toPage: number }[];
};

export type StackPagePlan = {
  pages: PlanPage[];
  entries: PlanEntry[];
};

export type PlanSong = {
  _id: string;
  isReserve?: boolean;
  file?: { filename?: string };
  reprises?: { fromPage: number; toPage: number }[];
};

export type PlanInput = {
  songs: PlanSong[];
  mealType?: string | null;
  programSelected?: string[];
  cover?: string | null;
};

/** Сколько страниц в документе по этому адресу. 0 — файл недоступен. */
export type PageCountLookup = (url: string) => number;

export const songUrl = (filename: string) => `/uploads/${filename}`;
export const mealUrl = (file: string) => `/meals-pdf/${file}`;

/**
 * Собирает список адресов, которые нужны для плана. Вызывающая сторона
 * открывает их и передаёт количество страниц обратно в buildStackPagePlan.
 */
export function collectPlanUrls(input: PlanInput): string[] {
  const urls: string[] = [];

  const hasTrapeza = (input.programSelected ?? []).includes("Трапеза");
  const meal = hasTrapeza && input.mealType ? MEAL_FILES_MAP[input.mealType] : null;
  if (meal) {
    urls.push(mealUrl(meal.start), mealUrl(meal.end));
  }

  for (const song of input.songs) {
    const filename = song?.file?.filename;
    if (filename) urls.push(songUrl(filename));
  }

  return Array.from(new Set(urls));
}

export function buildStackPagePlan(
  input: PlanInput,
  pageCountOf: PageCountLookup,
  reprisesById?: Map<string, { fromPage: number; toPage: number }[]>,
): StackPagePlan {
  const pages: PlanPage[] = [];
  const entries: PlanEntry[] = [];

  const songs = input.songs ?? [];
  const mainSongs = songs.filter((s) => !s.isReserve);
  const reserveSongs = songs.filter((s) => s.isReserve);

  const hasTrapeza = (input.programSelected ?? []).includes("Трапеза");
  const meal = hasTrapeza && input.mealType ? MEAL_FILES_MAP[input.mealType] : null;

  const coverName = input.cover && COVER_COLORS[input.cover] ? input.cover : null;
  const coverColor = coverName ? COVER_COLORS[coverName] : null;

  // Курсор — номер следующей страницы, нумерация с единицы, как в склейке
  const cursor = () => pages.length + 1;

  const addBlank = () => pages.push({ kind: "blank" });

  const addSection = (label: string) => {
    if (coverColor) pages.push({ kind: "section", label, color: coverColor });
    else addBlank();
  };

  /** Выровнять на нечётную (левую) страницу */
  const alignToLeftPage = () => {
    if (cursor() % 2 === 0) addBlank();
  };

  /** Выровнять на чётную (правую), слева поставив разделитель */
  const alignToRightPageWithSection = (label: string) => {
    if (cursor() % 2 !== 0) addSection(label);
  };

  const appendDoc = (
    url: string,
    kind: PlanEntry["kind"],
    isReserve: boolean,
    song?: PlanSong,
  ) => {
    const pageCount = pageCountOf(url);
    // Недоступный файл пропускается — ровно как склейка проглатывает ошибку
    if (!pageCount) return;

    const pageOffset = cursor();
    for (let i = 1; i <= pageCount; i++) {
      pages.push({ kind: "doc", url, pageInDoc: i, songId: song?._id });
    }

    entries.push({
      isReserve,
      pageOffset,
      pageCount,
      kind,
      songId: song?._id,
      reprises: song
        ? reprisesById?.get(song._id) ?? song.reprises ?? []
        : undefined,
    });
  };

  // Тропарь — на правой странице, слева разделитель
  if (meal) {
    alignToRightPageWithSection("Тропарь");
    appendDoc(mealUrl(meal.start), "trapeza-start", false);
  }

  for (const song of mainSongs) {
    const filename = song?.file?.filename;
    if (!filename) continue;
    alignToLeftPage();
    appendDoc(songUrl(filename), "song", false, song);
  }

  // Кондак — всегда с левой страницы
  if (meal) {
    alignToLeftPage();
    appendDoc(mealUrl(meal.end), "trapeza-end", false);
  }

  if (reserveSongs.length > 0) {
    alignToLeftPage();
    addSection("Резерв");

    for (const song of reserveSongs) {
      const filename = song?.file?.filename;
      if (!filename) continue;
      alignToLeftPage();
      appendDoc(songUrl(filename), "song", true, song);
    }
  }

  return { pages, entries };
}
