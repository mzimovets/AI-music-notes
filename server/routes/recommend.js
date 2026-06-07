import Anthropic from "@anthropic-ai/sdk";

const getClient = () =>
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Извлекает JSON из текста ответа Claude
 */
function parseJsonResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Нет JSON в ответе модели");
  return JSON.parse(match[0]);
}

export function recommendRoutes(app) {
  /**
   * POST /api/recommend
   * Подбирает репертуар из библиотеки песнопений для заданного контекста и длительности.
   * Body: { context: string, durationMinutes: number, songs: [{name, author?, category?}] }
   * Returns: { status: "ok", recommendations: [{name, author, section, reason}] }
   */
  app.post("/api/recommend", async (req, res) => {
    const { context, durationMinutes, songs } = req.body;

    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      return res.status(400).json({ status: "error", message: "Список песнопений не передан" });
    }

    const avgMinutesPerSong = 3;
    const estimatedCount = Math.max(1, Math.round(durationMinutes / avgMinutesPerSong));

    const songList = songs
      .map((s) => `- ${s.name}${s.author ? ` (${s.author})` : ""}${s.category ? ` [${s.category}]` : ""}`)
      .join("\n");

    const prompt = `Ты помощник регента православного хора. Подбери программу богослужения.

Контекст богослужения: ${context || "воскресная Литургия"}
Продолжительность: ${durationMinutes} минут (выбери примерно ${estimatedCount} песнопений)

Доступные песнопения в библиотеке хора:
${songList}

Задача: выбери из этого списка ${estimatedCount} подходящих песнопений в правильном литургическом порядке.
Выбирай ТОЛЬКО из предоставленного списка — не придумывай новые названия.
Распредели по разделам: «Начало», «Литургия», «Причастен».

Ответь СТРОГО в формате JSON (никакого текста вне JSON):
{
  "rationale": "2-3 предложения: логика подбора программы, почему именно эти произведения для данного контекста",
  "recommendations": [
    {
      "name": "точное название из списка выше",
      "author": "автор если есть, иначе пустая строка",
      "section": "Начало",
      "reason": "одно предложение почему это песнопение здесь"
    }
  ]
}`;

    try {
      const client = getClient();
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      });

      const text = message.content[0]?.type === "text" ? message.content[0].text : "";
      const parsed = parseJsonResponse(text);

      if (!Array.isArray(parsed.recommendations)) {
        throw new Error("Неверная структура ответа");
      }

      res.json({ status: "ok", recommendations: parsed.recommendations, rationale: parsed.rationale ?? "" });
    } catch (err) {
      console.error("[recommend] Ошибка:", err.message);
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  /**
   * POST /api/sort-program
   * Расставляет песнопения в правильный литургический порядок.
   * Body: { songNames: string[], context?: string }
   * Returns: { status: "ok", sorted: [{name, section, reason}] }
   */
  app.post("/api/sort-program", async (req, res) => {
    const { songNames, context } = req.body;

    if (!songNames || !Array.isArray(songNames) || songNames.length === 0) {
      return res.status(400).json({ status: "error", message: "Список песнопений не передан" });
    }

    const numbered = songNames.map((n, i) => `${i + 1}. ${n}`).join("\n");

    const prompt = `Ты помощник регента православного хора. Расставь богослужебные песнопения в правильный литургический порядок.

Контекст: ${context || "воскресная Литургия"}

Песнопения для расстановки:
${numbered}

Расставь их в литургически правильном порядке и раздели на три части:
- «Разгрев» — входные, начальные песнопения
- «Середина» — основная часть богослужения
- «Финал» — причастен, завершение, отпуст

Ответь СТРОГО в формате JSON (никакого текста вне JSON):
{
  "sorted": [
    {
      "name": "точное название из списка выше",
      "section": "Разгрев",
      "reason": "одно предложение почему это песнопение здесь"
    }
  ]
}`;

    try {
      const client = getClient();
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      });

      const text = message.content[0]?.type === "text" ? message.content[0].text : "";
      const parsed = parseJsonResponse(text);

      if (!Array.isArray(parsed.sorted)) {
        throw new Error("Неверная структура ответа");
      }

      res.json({ status: "ok", sorted: parsed.sorted });
    } catch (err) {
      console.error("[sort-program] Ошибка:", err.message);
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  /**
   * POST /api/extract-lyrics
   * Извлекает структуру/настроение из текста песнопения для контекста.
   * Body: { name: string, lyrics?: string }
   * Returns: { status: "ok", tags: string[], mood: string }
   */
  app.post("/api/extract-lyrics", async (req, res) => {
    const { name, lyrics } = req.body;

    if (!name) {
      return res.status(400).json({ status: "error", message: "Название не передано" });
    }

    const prompt = `Ты помощник регента православного хора.

Песнопение: «${name}»
${lyrics ? `\nТекст:\n${lyrics}` : ""}

Определи теги и настроение этого православного песнопения.

Ответь СТРОГО в формате JSON:
{
  "tags": ["тег1", "тег2"],
  "mood": "краткое описание настроения (3-5 слов)",
  "liturgicalPlace": "где в службе обычно поётся"
}`;

    try {
      const client = getClient();
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });

      const text = message.content[0]?.type === "text" ? message.content[0].text : "";
      const parsed = parseJsonResponse(text);
      res.json({ status: "ok", ...parsed });
    } catch (err) {
      console.error("[extract-lyrics] Ошибка:", err.message);
      res.status(500).json({ status: "error", message: err.message });
    }
  });
}
