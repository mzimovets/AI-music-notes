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
  const suspiciousChars = (text.match(/[|>•→©®]/g) || []).length;
  if (suspiciousChars > lines.length * 0.3) return false;

  return true;
}

/**
 * Из текста страницы вырезает блок, похожий на текст песни:
 * — много строк с кириллицей, — короткие строки (как стихи), — суммарно 80-3000 символов.
 */
function extractLyricsBlock(pageText, minLen = 80) {
  const paragraphs = pageText.split(/\n{2,}/);

  const scored = paragraphs.map((para) => {
    const lines = para.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return { para, score: 0 };

    const cyrLines = lines.filter(l => /[а-яёА-ЯЁ]/.test(l));
    const shortLines = cyrLines.filter(l => l.length > 2 && l.length < 80);
    const avgLen = shortLines.reduce((s, l) => s + l.length, 0) / (shortLines.length || 1);

    // Хорошие стихи: много коротких кириллических строк, средняя длина 10-50
    const score = shortLines.length * (avgLen > 8 && avgLen < 55 ? 2 : 0.5);
    return { para, score, len: para.length };
  });

  // Берём топ-блоки по score, не слишком короткие
  const good = scored
    .filter(s => s.score >= 4 && s.len >= minLen)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (good.length === 0) return null;

  // Склеиваем до 2500 символов
  let result = "";
  for (const { para } of good) {
    if (result.length + para.length > 2500) break;
    result += (result ? "\n\n" : "") + para.trim();
  }

  // Финальная проверка — убеждаемся что результат похож на стихи
  if (!result || result.length < minLen || !looksLikeLyrics(result)) return null;
  return result;
}

// ─── Парсеры конкретных сайтов ───────────────────────────────────────────────

/**
 * pesni.guru — большая база русских песен.
 * Поиск: https://pesni.guru/search?q=...
 */
async function fromPesniGuru(name) {
  const searchUrl = `https://pesni.guru/search?q=${encodeURIComponent(name)}`;
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
async function fromMegalyrics(name) {
  const searchUrl = `https://megalyrics.ru/search/?s=${encodeURIComponent(name)}`;
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
async function fromTekstovnik(name) {
  const searchUrl = `https://www.tekstovnik.ru/search/?q=${encodeURIComponent(name)}`;
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
 * Формат: https://amalgama-lab.com/songs/a/artist/song_slug.html
 * У них есть поиск, но попробуем через DuckDuckGo lite.
 */
async function fromAmalgama(name) {
  // Ищем через их поиск (если есть)
  const searchUrl = `https://amalgama-lab.com/search/?q=${encodeURIComponent(name)}`;
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
 */
async function fromWikisource(name) {
  const wikiName = encodeURIComponent(name.replace(/\s+/g, "_"));
  const url = `https://ru.wikisource.org/wiki/${wikiName}`;
  const html = await fetchHtml(url);
  return extractLyricsBlock(htmlToText(html));
}

// ─── Главная функция ─────────────────────────────────────────────────────────

/**
 * Пробует все сайты параллельно, возвращает первый успешный результат.
 * @param {string} name — название песни
 * @returns {Promise<string|null>}
 */
export async function fetchLyricsFromWeb(name) {
  const fetchers = [
    { site: "pesni.guru",    fn: () => fromPesniGuru(name) },
    { site: "megalyrics.ru", fn: () => fromMegalyrics(name) },
    { site: "tekstovnik.ru", fn: () => fromTekstovnik(name) },
    { site: "amalgama-lab",  fn: () => fromAmalgama(name) },
    { site: "rustih.ru",     fn: () => fromRustih(name) },
    { site: "folk-tale.ru",  fn: () => fromFolkTale(name) },
    { site: "wikisource",    fn: () => fromWikisource(name) },
  ];

  // Запускаем все параллельно, возвращаем первый непустой результат
  return new Promise((resolve) => {
    let resolved = false;
    let pending = fetchers.length;

    for (const { site, fn } of fetchers) {
      fn()
        .then((lyrics) => {
          if (!resolved && lyrics && lyrics.length >= 80) {
            resolved = true;
            console.log(`[lyrics] «${name}» → найден текст на ${site} (${lyrics.length} симв.)`);
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
