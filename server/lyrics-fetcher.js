/**
 * lyrics-fetcher.js
 * Парсит тексты песен с нескольких русскоязычных сайтов.
 * Используется в analyze.js перед отправкой в Claude.
 */

// ─── Утилиты ────────────────────────────────────────────────────────────────

function translitRu(text) {
  const map = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"j",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };
  return text.toLowerCase()
    .split("").map(c => map[c] ?? (c === " " ? "-" : c)).join("")
    .replace(/-+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function fetchHtml(url, timeout = 9000) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

/**
 * Убирает скрипты, стили, теги — оставляет читаемый текст с переносами строк.
 */
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/**
 * Проверяет, похож ли текст на стихи/песню:
 * — большинство строк кириллические и короткие (как стихи)
 * — не похоже на меню, навигацию, список ссылок
 */
function looksLikeLyrics(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 4) return false;

  const cyrLines = lines.filter(l => /[а-яёА-ЯЁ]{2,}/.test(l));
  const shortCyrLines = cyrLines.filter(l => l.length >= 3 && l.length <= 70);
  const ratio = shortCyrLines.length / lines.length;

  // Минимум 60% строк должны быть короткими кириллическими
  if (ratio < 0.6) return false;

  // Средняя длина строки должна быть как у стихов (10–50 символов)
  const avgLen = shortCyrLines.reduce((s, l) => s + l.length, 0) / shortCyrLines.length;
  if (avgLen < 8 || avgLen > 60) return false;

  // Не должно быть слишком много ссылок / спецсимволов (признак навигации)
  const suspiciousChars = (text.match(/[|>•→©®»«]/g) || []).length;
  if (suspiciousChars > lines.length * 0.2) return false;

  return true;
}

// Ключевые слова которые выдают не-текст (навигация, формы, копирайт)
const JUNK_KEYWORDS = [
  "Заглавная страница", "Свежие правки", "Случайная страница", "Ссылки сюда",
  "Постоянная ссылка", "Служебные страницы", "Войти", "Обсуждение",
  "Добавить комментарий", "Ваш адрес email", "Обязательные поля",
  "Копирайт ©", "Copyright ©", "Все права защищены", "All rights reserved",
  "Политика конфиденциальности", "Пользовательское соглашение",
  "Войдите или зарегистрируйтесь",
  "Популярные тексты", "Популярные песни", "Последние добавленные",
  "Все исполнители", "Все жанры", "Топ песен",
];

/**
 * Ищет в тексте страницы самый длинный непрерывный блок лирики.
 * Лирика = 6+ подряд идущих коротких кириллических строк.
 */
function extractLyricsBlock(pageText) {
  const allLines = pageText.split("\n").map(l => l.trim());

  // Паттерн навигации: "Исполнитель - Название" или "Автор - Произведение"
  // Два слова с заглавной буквы, разделённые " - " — это список песен, не лирика
  const isNavLine = (l) => /^[А-ЯЁA-Z\d][\w\s]+ - [А-ЯЁA-Z\d]/.test(l);

  // Скользящее окно: ищем самую длинную серию "лирических" строк
  const isLyricLine = (l) =>
    l.length >= 2 && l.length <= 75 &&
    /[а-яёА-ЯЁ]/.test(l) &&
    !/[»«|©®@]/.test(l) &&
    !isNavLine(l) &&
    !JUNK_KEYWORDS.some(kw => l.includes(kw));

  let bestStart = -1, bestLen = 0;
  let curStart = -1, curLen = 0;
  let emptyStreak = 0; // разрешаем до 2 пустых строк внутри блока

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    if (isLyricLine(line)) {
      if (curStart === -1) curStart = i;
      curLen++;
      emptyStreak = 0;
    } else if (line === "" && curStart !== -1 && emptyStreak < 2) {
      // пустая строка внутри блока — ок (разделитель куплетов)
      emptyStreak++;
    } else {
      // конец блока
      if (curLen > bestLen) { bestStart = curStart; bestLen = curLen; }
      curStart = -1; curLen = 0; emptyStreak = 0;
    }
  }
  if (curLen > bestLen) { bestStart = curStart; bestLen = curLen; }

  if (bestStart === -1 || bestLen < 8) return null;

  const block = allLines.slice(bestStart, bestStart + bestLen + 3).join("\n").trim();
  if (block.length < 250) return null;
  if (JUNK_KEYWORDS.some(kw => block.includes(kw))) return null;

  // Финальная проверка: если > 25% строк — "Автор - Название", это навигация, не лирика
  const blockLines = block.split("\n").filter(l => l.trim().length > 0);
  const navRatio = blockLines.filter(l => isNavLine(l.trim())).length / blockLines.length;
  if (navRatio > 0.25) return null;

  return block.slice(0, 2500);
}

// ─── Парсеры конкретных сайтов ───────────────────────────────────────────────

/**
 * Строит поисковый запрос: включает автора слов и автора музыки чтобы
 * найти именно нужную версию (напр. «Ave Maria Шуберт», а не случайную).
 */
function buildQuery(name, authorLyrics, author) {
  const parts = [name];

  // Берём фамилию автора слов (приоритет — он пишет текст)
  if (authorLyrics) {
    const surname = authorLyrics.trim().split(/\s+/).pop();
    if (surname && surname.length > 2) parts.push(surname);
  }

  // Добавляем фамилию автора музыки если она не совпадает с уже добавленной
  if (author) {
    const surname = author.trim().split(/\s+/).pop();
    if (surname && surname.length > 2 && !parts.includes(surname)) {
      parts.push(surname);
    }
  }

  return parts.join(" ");
}

/**
 * pesni.guru — большая база русских песен.
 * Поиск: https://pesni.guru/search?q=...
 */
async function fromPesniGuru(name, query) {
  const searchUrl = `https://pesni.guru/search?q=${encodeURIComponent(query)}`;
  const searchHtml = await fetchHtml(searchUrl);

  // Ищем ссылку на страницу песни в результатах
  const linkMatch = searchHtml.match(/href="(\/text\/[^"?]+)"/);
  if (!linkMatch) return null;

  const songUrl = `https://pesni.guru${linkMatch[1]}`;
  const songHtml = await fetchHtml(songUrl);

  // Пробуем извлечь блок lyrics напрямую (id или class)
  const lyricsDiv = songHtml.match(/<div[^>]+(?:class|id)="[^"]*(?:lyrics|tekst|text-song|song-text)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (lyricsDiv) {
    const text = htmlToText(lyricsDiv[1]);
    if (text.length >= 80) return text.slice(0, 2500);
  }

  // Фоллбэк: берём весь текст страницы и ищем лирика-блок
  return extractLyricsBlock(htmlToText(songHtml));
}

/**
 * megalyrics.ru — ещё одна большая база.
 */
async function fromMegalyrics(name, query) {
  const searchUrl = `https://megalyrics.ru/search/?s=${encodeURIComponent(query)}`;
  const searchHtml = await fetchHtml(searchUrl);

  const linkMatch = searchHtml.match(/href="(https?:\/\/megalyrics\.ru\/lyric\/[^"?]+)"/i);
  if (!linkMatch) return null;

  const songHtml = await fetchHtml(linkMatch[1]);
  const lyricsDiv = songHtml.match(/<div[^>]+class="[^"]*lyric[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (lyricsDiv) {
    const text = htmlToText(lyricsDiv[1]);
    if (text.length >= 80) return text.slice(0, 2500);
  }
  return extractLyricsBlock(htmlToText(songHtml));
}

/**
 * tekstovnik.ru
 */
async function fromTekstovnik(name, query) {
  const searchUrl = `https://www.tekstovnik.ru/search/?q=${encodeURIComponent(query)}`;
  const searchHtml = await fetchHtml(searchUrl);

  const linkMatch = searchHtml.match(/href="(\/text\/[^"?]+)"/);
  if (!linkMatch) return null;

  const songUrl = `https://www.tekstovnik.ru${linkMatch[1]}`;
  const songHtml = await fetchHtml(songUrl);
  return extractLyricsBlock(htmlToText(songHtml));
}

/**
 * rustih.ru — есть народные и советские песни.
 * Прямой URL по транслитерации.
 */
async function fromRustih(name) {
  const slug = translitRu(name);
  const url = `https://rustih.ru/${slug}/`;
  const html = await fetchHtml(url);

  // Ищем блок стихотворения
  const verseDiv = html.match(/<div[^>]+class="[^"]*(?:poem|verse|entry-content|poem-text)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (verseDiv) {
    const text = htmlToText(verseDiv[1]);
    if (text.length >= 80) return text.slice(0, 2500);
  }
  return extractLyricsBlock(htmlToText(html));
}

/**
 * amalgama-lab.com — хорошо для советских / классических / детских.
 */
async function fromAmalgama(name, query) {
  const searchUrl = `https://amalgama-lab.com/search/?q=${encodeURIComponent(query)}`;
  const searchHtml = await fetchHtml(searchUrl);

  const linkMatch = searchHtml.match(/href="(\/songs\/[^"?#]+\.html)"/i);
  if (!linkMatch) return null;

  const songUrl = `https://amalgama-lab.com${linkMatch[1]}`;
  const songHtml = await fetchHtml(songUrl);
  return extractLyricsBlock(htmlToText(songHtml));
}

/**
 * folk-tale.ru — народные и советские.
 */
async function fromFolkTale(name) {
  const slug = translitRu(name);
  const url = `https://folk-tale.ru/slova-pesni/slova-pesni-${slug}.shtml`;
  const html = await fetchHtml(url);
  return extractLyricsBlock(htmlToText(html));
}

/**
 * Wikisource (ru.wikisource.org) — классика, народные.
 * Используем поиск вместо прямого URL — надёжнее.
 */
async function fromWikisource(name) {
  const searchUrl = `https://ru.wikisource.org/w/index.php?search=${encodeURIComponent(name)}&ns0=1`;
  const searchHtml = await fetchHtml(searchUrl);
  // Ищем ссылку на страницу в результатах поиска
  const linkMatch = searchHtml.match(/href="(\/wiki\/[^"?#:]+)"[^>]*>[^<]*(?:[Тт]екст|[Пп]есн)/);
  if (!linkMatch) return null;
  const songUrl = `https://ru.wikisource.org${linkMatch[1]}`;
  const songHtml = await fetchHtml(songUrl);
  return extractLyricsBlock(htmlToText(songHtml));
}

// ─── DuckDuckGo Lite поиск ───────────────────────────────────────────────────

/**
 * Ищет через DuckDuckGo Lite (не блокирует ботов) и возвращает список URL результатов.
 */
async function ddgSearch(query, maxResults = 6) {
  const res = await fetch(`https://lite.duckduckgo.com/lite?q=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ru-RU,ru;q=0.9" },
  });
  const html = await res.text();
  // DDG lite кодирует ссылки как: href="//duckduckgo.com/l/?uddg=ENCODED_URL&..."
  const urls = [];
  for (const m of html.matchAll(/uddg=(https?%3A[^&"]+)/g)) {
    try {
      const url = decodeURIComponent(m[1]);
      if (!urls.includes(url)) urls.push(url);
      if (urls.length >= maxResults) break;
    } catch {}
  }
  return urls;
}

/**
 * Пытается извлечь текст песни из произвольного URL.
 */
async function fetchLyricsFromUrl(url) {
  const html = await fetchHtml(url, 10000);
  return extractLyricsBlock(htmlToText(html));
}

// ─── Главная функция ─────────────────────────────────────────────────────────

/**
 * Пробует найти текст песни: все источники запускаются параллельно,
 * возвращается первый успешный результат.
 *
 * Порядок приоритетов (первый кто вернёт >= 150 символов — побеждает):
 * – Прямые парсеры конкретных сайтов (быстрее и надёжнее поисковиков)
 * – DuckDuckGo Lite как дополнительный шанс
 *
 * @param {string} name — название песни
 * @param {string} [authorLyrics] — автор слов
 * @param {string} [author] — автор музыки
 * @returns {Promise<string|null>}
 */
export async function fetchLyricsFromWeb(name, authorLyrics = "", author = "") {
  const query = buildQuery(name, authorLyrics, author);
  console.log(`[lyrics] поиск: «${query}»`);

  // Все источники запускаем параллельно — возвращаем первый успешный результат
  const sources = [
    { site: "pesni.guru",      fn: () => fromPesniGuru(name, query) },
    { site: "amalgama-lab",    fn: () => fromAmalgama(name, query) },
    { site: "megalyrics.ru",   fn: () => fromMegalyrics(name, query) },
    { site: "tekstovnik.ru",   fn: () => fromTekstovnik(name, query) },
    { site: "rustih.ru",       fn: () => fromRustih(name) },
    { site: "folk-tale.ru",    fn: () => fromFolkTale(name) },
    { site: "wikisource",      fn: () => fromWikisource(name) },
    {
      site: "duckduckgo",
      fn: async () => {
        const urls = await ddgSearch(`${query} текст слова`);
        console.log(`[lyrics] DDG нашёл ${urls.length} ссылок`);
        for (const url of urls) {
          try {
            const lyrics = await fetchLyricsFromUrl(url);
            if (lyrics && lyrics.length >= 150) return lyrics;
          } catch {}
        }
        return null;
      },
    },
  ];

  return new Promise((resolve) => {
    let resolved = false;
    let pending = sources.length;

    for (const { site, fn } of sources) {
      fn()
        .then((lyrics) => {
          if (!resolved && lyrics && lyrics.length >= 150) {
            resolved = true;
            console.log(`[lyrics] «${name}» → ${site} (${lyrics.length} симв.)`);
            resolve(lyrics);
          }
        })
        .catch((e) => {
          console.log(`[lyrics] «${name}» ${site}: ${e.message}`);
        })
        .finally(() => {
          pending--;
          if (pending === 0 && !resolved) {
            console.log(`[lyrics] «${name}» — текст не найден ни на одном сайте`);
            resolve(null);
          }
        });
    }
  });
}
