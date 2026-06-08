import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { database } from "../index.js";
import { fetchLyricsFromWeb } from "../lyrics-fetcher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../uploads");

const MODEL = "claude-opus-4-8";

// ─── Извлечение текста из PDF ─────────────────────────────────────────────────

function dedupeTokens(line) {
  // "Бьёт Бьёт  ся ся  в в" → "Бьёт ся в"
  // "ты ты,," → "ты," (сравниваем без знаков препинания)
  const tokens = line.split(/\s+/).filter(Boolean);
  const out = [];
  for (const tok of tokens) {
    const norm = tok.replace(/[.,;:!?]+$/, "").toLowerCase();
    const prevNorm = (out[out.length - 1] || "").replace(/[.,;:!?]+$/, "").toLowerCase();
    if (norm !== prevNorm || norm === "") {
      out.push(tok);
    } else {
      // Берём версию с пунктуацией (последнюю из пары)
      if (tok.length > out[out.length - 1].length) {
        out[out.length - 1] = tok;
      }
    }
  }
  // Убираем двойную пунктуацию: ",," → ","
  return out.join(" ").replace(/([.,;:!?])\1+/g, "$1");
}

function cleanPdfText(raw) {
  if (!raw) return "";

  const lines = raw.split("\n");
  const cleaned = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    // Пропускаем строки без кириллицы
    if (!/[а-яёА-ЯЁ]/.test(line)) continue;
    // Пропускаем строки только из цифр/пробелов
    if (/^[\d\s]+$/.test(line)) continue;
    // Пропускаем строки-метки голосов типа "С А Т Б" или "S A T B"
    if (/^[САТБ\sSATB]+$/.test(line)) continue;
    // Убираем дублирование токенов SATB
    line = dedupeTokens(line);
    if (!line || line.replace(/\s/g, "").length < 2) continue;
    cleaned.push(line);
  }

  // Убираем дубликаты соседних строк
  const deduped = [];
  for (const line of cleaned) {
    if (deduped[deduped.length - 1] !== line) deduped.push(line);
  }

  return deduped.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function extractPdfText(filePath) {
  try {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ url: filePath });
    const result = await parser.getText();
    return cleanPdfText(result.text).slice(0, 2000) || "";
  } catch (e) {
    console.warn("[analyze] pdf-parse error:", e.message);
    return "";
  }
}

// ─── Выполнение инструментов (WebSearch / WebFetch) ──────────────────────────

/**
 * Транслитерация кириллицы → латиница (для URL rustih.ru и подобных).
 */
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

/**
 * Вместо поиска — сразу строим прямые URL на известные сайты с текстами.
 * Поисковики (DuckDuckGo, Яндекс) блокируют ботов, а прямые сайты работают.
 * @param {string} query  — поисковый запрос от Claude (игнорируем, используем songName)
 * @param {string} songName — оригинальное название из БД (точное, без мусора)
 */
async function executeWebSearch(query, songName) {
  // Используем оригинальное название из БД если передано,
  // иначе пробуем очистить запрос Claude от типичных заполнителей
  if (!songName) {
    const STOP = new Set(["текст","слов","слова","lyrics","песни","хоровая","песня","читать","онлайн"]);
    songName = query.replace(/["'«»]/g,"").trim().split(/\s+/)
      .filter(w => !STOP.has(w.toLowerCase())).join(" ").trim();
  }

  const slug = translitRu(songName);
  const wikiName = encodeURIComponent(songName.replace(/\s+/g, "_"));

  // Проверяем кандидатов параллельно
  const candidates = [
    { url: `https://ru.wikisource.org/wiki/${wikiName}`, title: "Викитека (Wikisource)" },
    { url: `https://rustih.ru/${slug}/`, title: "РуСтих" },
    { url: `https://folk-tale.ru/slova-pesni/slova-pesni-${slug}.shtml`, title: "folk-tale.ru" },
    { url: `https://pojelanie.ru/zastol/pesni/rn/${slug}.php`, title: "pojelanie.ru" },
  ];

  const found = (await Promise.allSettled(
    candidates.map(async (c) => {
      const r = await fetch(c.url, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
        redirect: "follow",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return c;
    })
  ))
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);

  if (found.length === 0) {
    return `Прямые ссылки на текст песни «${songName}» не найдены автоматически.\nИспользуй свои знания о тексте этой песни из обучающих данных.`;
  }

  return found.map(c => `${c.title}\n${c.url}`).join("\n\n---\n\n")
    + `\n\nЗагрузи первую ссылку через WebFetch чтобы получить текст.`;
}

/**
 * Загрузка страницы с очисткой HTML от тегов, скриптов и стилей.
 */
async function executeWebFetch(rawUrl) {
  try {
    const res = await fetch(rawUrl, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
    });
    const html = await res.text();

    // Удаляем скрипты, стили, навигацию — оставляем только текст
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return text.slice(0, 4000) || "Страница пуста";
  } catch (e) {
    return `Ошибка загрузки: ${e.message}`;
  }
}

// ─── Запрос к Claude ──────────────────────────────────────────────────────────

async function analyzeWithClaude(songName, pdfText, webLyrics = null) {
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
  // aiprimetech.io использует ANTHROPIC_AUTH_TOKEN + Authorization: Bearer
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;

  console.log(`[analyze] baseUrl=${baseUrl} | key=${apiKey ? apiKey.slice(0,16)+"…" : "НЕТ"}`);
  if (!apiKey) throw new Error("ANTHROPIC_AUTH_TOKEN не задан");

  const authHeaders = {
    "Authorization": `Bearer ${apiKey}`,
    "anthropic-version": "2023-06-01",
  };

  // Есть ли кириллица в PDF (не просто "па, па, па...")
  const hasRealText = pdfText
    ? (pdfText.match(/[а-яёА-ЯЁ]{3,}/g) || []).length >= 3
    : false;

  // Система: требуем JSON на русском языке
  const SYSTEM = [
    "Ты — инструмент анализа хоровых произведений.",
    "Отвечай ТОЛЬКО на русском языке.",
    "Верни ТОЛЬКО валидный JSON-объект — никакого другого текста.",
  ].join(" ");

  const pdfSection = hasRealText
    ? `\n\nТекст из PDF нот (вспомогательный, может содержать ошибки SATB-записи):\n---\n${pdfText.slice(0, 1000)}\n---`
    : "";

  const webSection = webLyrics
    ? `\n\nТекст песни, найденный в интернете (основной источник):\n---\n${webLyrics.slice(0, 1500)}\n---`
    : "";

  const lyricsInstruction = webLyrics
    ? `Поле lyrics: проверь, что текст из раздела «Текст песни» выше действительно соответствует песне «${songName}» (совпадают характерные строки, тема, стиль). Если соответствует — скопируй его. Если текст явно чужой (другая песня, проза, навигация) — используй свои знания или оставь пустым "".`
    : hasRealText
      ? "Поле lyrics заполни текстом из раздела «Текст из PDF» выше (исправь очевидные ошибки SATB-нотации)."
      : "Поле lyrics заполни текстом этой песни из своих знаний, если знаешь его точно. Если не уверен — оставь пустым \"\".";

  const userContent = `Проанализируй хоровую песню «${songName}».${webSection}${pdfSection}

${lyricsInstruction}

Верни ТОЛЬКО JSON на русском языке (никаких пояснений до или после):
{"mood":"настроение (3-5 слов)","description":"1-2 предложения о песне","tags":["тег1","тег2"],"lyrics":""}

Поля mood, description и tags заполни на основе своих знаний о характере и содержании произведения.`;

  // До 3 попыток получить JSON
  const messages = [{ role: "user", content: userContent }];
  for (let turn = 0; turn < 3; turn++) {
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        messages,
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error(`[analyze "${songName}"] HTTP ${res.status}: ${raw.slice(0, 300)}`);
      throw new Error(`API HTTP ${res.status}: ${raw.slice(0, 150)}`);
    }
    const data = JSON.parse(raw);
    const blocks = data?.content || [];

    // Логируем кратко: модель + тип каждого блока
    const usedModel = data?.model || "?";
    const blockSummary = blocks.map((b) =>
      b.type === "text"
        ? `text(${b.text?.slice(0, 80).replace(/\n/g, " ")}…)`
        : `${b.type}:${b.name}(${JSON.stringify(b.input || {}).slice(0, 60)})`
    ).join(" | ");
    console.log(`[analyze "${songName}"] turn=${turn} model=${usedModel} HTTP ${res.status}: ${blockSummary}`);

    // Ищем JSON среди всех текстовых блоков
    for (const b of blocks) {
      if (b?.type === "text") {
        const text = b.text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch (parseErr) {
            console.warn(`[analyze "${songName}"] invalid JSON on turn=${turn}:`, match[0].slice(0, 200));
            const fixed = match[0].replace(/"lyrics"\s*:\s*"[^"]*$/, '"lyrics": ""}');
            try { return JSON.parse(fixed); } catch {}
          }
        } else {
          console.warn(`[analyze "${songName}"] no JSON in text block, turn=${turn}:`, b.text.slice(0, 300));
        }
      }
    }

    // OpenAI-формат (на случай если прокси возвращает OpenAI-совместимый ответ)
    const fallback = data?.choices?.[0]?.message?.content || "";
    if (fallback) {
      const match = fallback.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim().match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
    }

    // Если JSON не найден — повторяем с более жёстким промптом
    console.warn(`[analyze "${songName}"] нет JSON на turn=${turn}, повторяю...`);
    messages.push({ role: "assistant", content: blocks.map(b => b.type === "text" ? { type: "text", text: b.text } : b).filter(b => b.type === "text") });
    messages.push({ role: "user", content: `Верни ТОЛЬКО JSON без пояснений:\n{"mood":"...","description":"...","tags":[],"lyrics":""}` });
  }

  // Все ходы исчерпаны — возвращаем минимальный результат чтобы не зависать
  console.error(`[analyze "${songName}"] исчерпаны все попытки, сохраняю пустой результат`);
  return { mood: "", description: "", tags: [], lyrics: "" };
}

// ─── Журнал анализа (в памяти, макс. 200 записей) ────────────────────────────

const analyzeJournal = [];

function journalAdd(entry) {
  const ts = Date.now();
  // Если запись для этой песни уже есть — обновляем её на месте
  const idx = analyzeJournal.findIndex((e) => e.name === entry.name);
  if (idx !== -1) {
    analyzeJournal[idx] = { ...analyzeJournal[idx], ...entry, ts };
  } else {
    analyzeJournal.push({ ...entry, ts });
    if (analyzeJournal.length > 200) analyzeJournal.shift();
  }
}

// ─── Роуты ───────────────────────────────────────────────────────────────────

export function analyzeRoutes(app) {
  /**
   * GET /api/songs/lyrics?name=...
   * Возвращает lyrics из БД по имени песни.
   */
  app.get("/api/songs/lyrics", (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ status: "error", message: "name required" });
    database.findOne({ docType: "song", name }, (err, song) => {
      if (err || !song) return res.status(404).json({ status: "error", message: "not found" });
      res.json({ status: "ok", lyrics: song.aiSummary?.lyrics || "", mood: song.aiSummary?.mood || "" });
    });
  });

  /**
   * POST /api/songs/:id/analyze
   * Анализирует одну песню и сохраняет результат в БД.
   */
  app.post("/api/songs/:id/analyze", async (req, res) => {
    const { id } = req.params;

    database.findOne({ _id: id, docType: "song" }, async (err, song) => {
      if (err || !song) {
        return res.status(404).json({ status: "error", message: "Песня не найдена" });
      }

      // Если уже проанализировано и не запрошен принудительный сброс
      if (song.aiSummary && !req.query.force) {
        return res.json({ status: "ok", aiSummary: song.aiSummary, cached: true });
      }

      try {
        const filename = song.file?.filename || song.originalName;
        const filePath = filename ? path.join(UPLOADS_DIR, filename) : null;
        const pdfText = filePath && fs.existsSync(filePath) ? await extractPdfText(filePath) : "";

        // Всегда ищем текст в интернете: PDF нот содержит SATB-текст с артефактами,
        // веб-источник даёт чистый текст песни — он всегда предпочтительнее.
        const webLyrics = await fetchLyricsFromWeb(song.name, song.authorLyrics || "", song.author || "");
        if (webLyrics) console.log(`[analyze] «${song.name}» — используем веб-текст (${webLyrics.length} симв.)`);
        else console.log(`[analyze] «${song.name}» — веб не нашёл, используем только PDF`);

        const aiSummary = await analyzeWithClaude(song.name, pdfText, webLyrics);
        aiSummary.analyzedAt = Date.now();
        aiSummary.hasPdfText = !!pdfText;
        aiSummary.hasWebLyrics = !!webLyrics;

        const update = { aiSummary };
        if (pdfText) update.extractedText = pdfText;
        if (webLyrics) update.webLyrics = webLyrics;

        database.update({ _id: id }, { $set: update }, {}, (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ status: "error", message: updateErr.message });
          }
          res.json({ status: "ok", aiSummary, cached: false });
        });
      } catch (e) {
        console.error("[analyze] error:", e.message);
        res.status(500).json({ status: "error", message: e.message });
      }
    });
  });

  /**
   * POST /api/songs/analyze-batch
   * Анализирует все песни без aiSummary пакетами по 3 (параллельно).
   * Возвращает статистику: { done, skipped, failed }.
   */
  app.post("/api/songs/analyze-batch", (req, res) => {
    database.find({ docType: "song", deletedAt: { $exists: false } }, (err, songs) => {
      if (err) return res.status(500).json({ status: "error", message: err.message });

      const todo = songs.filter((s) => !s.aiSummary);

      // Отвечаем сразу — работа идёт в фоне
      res.json({ status: "ok", queued: todo.length, total: songs.length });

      // Фоновая обработка
      (async () => {
        let done = 0, failed = 0;
        const BATCH = 6;
        for (let i = 0; i < todo.length; i += BATCH) {
          const chunk = todo.slice(i, i + BATCH);
          await Promise.allSettled(
            chunk.map(async (song) => {
              journalAdd({ name: song.name, status: "processing" });
              try {
                const filename = song.file?.filename || song.originalName;
                const filePath = filename ? path.join(UPLOADS_DIR, filename) : null;
                const pdfText = filePath && fs.existsSync(filePath) ? await extractPdfText(filePath) : "";

                // Всегда ищем текст в интернете: PDF нот содержит SATB-артефакты,
                // веб-источник даёт чистый текст песни — он всегда предпочтительнее.
                const webLyrics = await fetchLyricsFromWeb(song.name, song.authorLyrics || "", song.author || "");
                if (webLyrics) console.log(`[batch] «${song.name}» — используем веб-текст (${webLyrics.length} симв.)`);
                else console.log(`[batch] «${song.name}» — веб не нашёл, используем только PDF`);

                const aiSummary = await analyzeWithClaude(song.name, pdfText, webLyrics);
                aiSummary.analyzedAt = Date.now();
                aiSummary.hasPdfText = !!pdfText;
                aiSummary.hasWebLyrics = !!webLyrics;
                const update = { aiSummary };
                if (pdfText) update.extractedText = pdfText;
                if (webLyrics) update.webLyrics = webLyrics;
                await new Promise((resolve, reject) =>
                  database.update({ _id: song._id }, { $set: update }, {}, (e) =>
                    e ? reject(e) : resolve(null)
                  )
                );
                done++;
                const lyrics = aiSummary.lyrics || "";
                const lyricsPreview = lyrics.slice(0, 120).replace(/\n/g, " ");
                console.log(`[done] "${song.name}" | lyrics: ${lyrics ? lyrics.slice(0, 200) : "(нет)"}`);
                journalAdd({ name: song.name, status: "done", hasPdfText: !!pdfText, lyricsPreview, lyrics });
              } catch (e) {
                console.error(`[analyze-batch] failed for "${song.name}":`, e.message);
                failed++;
                journalAdd({ name: song.name, status: "error", error: e.message });
              }
            })
          );
          // пауза между батчами убрана для максимальной скорости
        }
        console.log(`[analyze-batch] done=${done} failed=${failed} total=${songs.length}`);
      })();
    });
  });

  /**
   * POST /api/songs/analyze-reset
   * Сбрасывает aiSummary у всех песен, чтобы batch переанализировал их заново.
   */
  app.post("/api/songs/analyze-reset", (req, res) => {
    database.update(
      { docType: "song", aiSummary: { $exists: true } },
      { $unset: { aiSummary: true } },
      { multi: true },
      (err, count) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        res.json({ status: "ok", reset: count });
      }
    );
  });

  /**
   * GET /api/songs/analyze-journal
   * Возвращает журнал последних событий анализа.
   */
  app.get("/api/songs/analyze-journal", (req, res) => {
    const since = Number(req.query.since) || 0;
    // Возвращаем все записи с ts > since (в т.ч. обновлённые)
    const entries = since
      ? analyzeJournal.filter((e) => e.ts > since)
      : analyzeJournal.slice(-50);
    res.json({ status: "ok", entries, serverTs: Date.now() });
  });

  /**
   * GET /api/songs/analyze-status
   * Возвращает сколько песен уже проанализировано.
   */
  app.get("/api/songs/analyze-status", (req, res) => {
    database.find({ docType: "song", deletedAt: { $exists: false } }, (err, songs) => {
      if (err) return res.status(500).json({ status: "error", message: err.message });
      const analyzed = songs.filter((s) => s.aiSummary).length;
      res.json({ status: "ok", analyzed, total: songs.length });
    });
  });
}
