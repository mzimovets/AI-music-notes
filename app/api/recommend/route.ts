import { NextRequest, NextResponse } from "next/server";

const MODEL = "claude-sonnet-4-6";

function parseJsonResponse(text: string) {
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error("[recommend] raw text was:", JSON.stringify(text));
    throw new Error("Нет JSON в ответе модели");
  }
  return JSON.parse(match[0]);
}

async function callClaude(messages: { role: string; content: string }[]): Promise<string> {
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
  const apiKey  = process.env.ANTHROPIC_API_KEY!;

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      // Запрещаем extended thinking — оно добавляет 30+ сек и не нужно для этой задачи
      thinking: { type: "disabled" },
      system: [
        "Ты — помощник по составлению концертных программ.",
        "Отвечай ТОЛЬКО валидным JSON-объектом без каких-либо пояснений, markdown или других слов.",
        "КРИТИЧНО: используй названия песен ТОЧНО так, как они написаны в библиотеке — не изменяй, не сокращай, не добавляй слова.",
      ].join(" "),
      messages,
    }),
  });

  const raw = await res.text();
  console.log("[recommend] HTTP status:", res.status);
  console.log("[recommend] raw response:", raw.slice(0, 600));

  const data = JSON.parse(raw);

  // Ищем блок с type="text" — sonnet может возвращать thinking-блоки перед текстом
  if (Array.isArray(data?.content)) {
    const textBlock = data.content.find((b: any) => b.type === "text" && b.text);
    if (textBlock) return textBlock.text;
  }

  // OpenAI-формат
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;

  throw new Error(`Неожиданный формат ответа: ${raw.slice(0, 200)}`);
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { status: "error", message: "ANTHROPIC_API_KEY не задан на сервере" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ status: "error", message: "Неверный JSON" }, { status: 400 });
  }

  const { context, durationMinutes, songs } = body as {
    context?: string;
    durationMinutes?: number;
    songs?: { name: string; category?: string; aiSummary?: { mood?: string; description?: string; tags?: string[] } | null }[];
  };

  if (!songs || !Array.isArray(songs) || songs.length === 0) {
    return NextResponse.json(
      { status: "error", message: "Список песнопений не передан" },
      { status: 400 }
    );
  }

  const dur = Number(durationMinutes) || 60;
  const estimatedCount = Math.max(1, Math.round(dur / 3));

  // Формируем список: имя, категория, mood + description + теги из AI-анализа
  const songList = songs
    .slice(0, 70)
    .map((s) => {
      const parts: string[] = [`"${s.name}"`];
      if (s.category) parts.push(`[${s.category}]`);
      if (s.aiSummary) {
        const { mood, description, tags } = s.aiSummary;
        const detail: string[] = [];
        if (mood) detail.push(mood);
        if (description) detail.push(description);
        if (tags?.length) detail.push(`теги: ${tags.join(", ")}`);
        if (detail.length) parts.push(`— ${detail.join(". ")}`);
      }
      return parts.join(" ");
    })
    .join("\n");

  const userPrompt = `Контекст выступления: ${context || "концерт"}.
Нужно подобрать ~${estimatedCount} произведений на ~${dur} минут.

Библиотека песен (используй названия ТОЧНО как написаны):
${songList}

ПРАВИЛА ОТБОРА — обязательно проверяй настроение и теги каждой песни:

1. Названия — ТОЛЬКО из библиотеки, без изменений.

2. СТРОГОЕ соответствие контексту по настроению/тегам:
   - Детский праздник / День защиты детей → ТОЛЬКО песни с тегами/настроением: весёлая, детская, игривая, радостная, сказочная. ЗАПРЕЩЕНО: грустная, лирическая, романтическая, военная, патриотическая, торжественная.
   - Военная тема / 9 мая / День Победы → военные, патриотические, героические. ЗАПРЕЩЕНО: детские, весёлые, романтические.
   - Лирический концерт → лирические, романтические, задушевные. ЗАПРЕЩЕНО: детские, маршевые.
   - Если контекст другой — подбирай по смыслу, строго соблюдая соответствие.

3. Если подходящих по контексту песен меньше нужного количества — выбери сколько есть, не добавляй неподходящие.

Верни JSON:
{"rationale":"2-3 предложения о логике программы","recommendations":[{"name":"ТОЧНОЕ название из библиотеки","reason":"почему эта песня подходит по контексту"}]}`;

  try {
    const text = await callClaude([{ role: "user", content: userPrompt }]);
    const parsed = parseJsonResponse(text);

    if (!Array.isArray(parsed.recommendations)) {
      throw new Error("Неверная структура ответа");
    }

    return NextResponse.json({
      status: "ok",
      recommendations: parsed.recommendations,
      rationale: parsed.rationale ?? "",
    });
  } catch (err: any) {
    console.error("[api/recommend]", err.message);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
