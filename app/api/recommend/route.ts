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

async function callClaude(prompt: string): Promise<string> {
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
  const apiKey  = process.env.ANTHROPIC_API_KEY!;

  // Пробуем Anthropic-формат (/v1/messages)
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // некоторые прокси ждут Bearer
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system: "Отвечай ТОЛЬКО валидным JSON. Никаких инструментов, поиска, пояснений.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const raw = await res.text();
  console.log("[recommend] HTTP status:", res.status);
  console.log("[recommend] raw response:", raw.slice(0, 500));

  const data = JSON.parse(raw);

  // Anthropic-формат: ищем блок с type="text" среди всех content-блоков
  if (Array.isArray(data?.content)) {
    const textBlock = data.content.find((b: any) => b.type === "text" && b.text);
    if (textBlock) return textBlock.text;
  }

  // OpenAI-формат: data.choices[0].message.content
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
    songs?: { name: string; author?: string; category?: string }[];
  };

  if (!songs || !Array.isArray(songs) || songs.length === 0) {
    return NextResponse.json(
      { status: "error", message: "Список песнопений не передан" },
      { status: 400 }
    );
  }

  const dur = Number(durationMinutes) || 60;
  const estimatedCount = Math.max(1, Math.round(dur / 3));

  const songList = songs
    .map((s) => {
      let line = `- ${s.name}`;
      if (s.category) line += ` [${s.category}]`;
      if ((s as any).aiSummary?.mood) line += ` — ${(s as any).aiSummary.mood}`;
      return line;
    })
    .join("\n");

  const prompt = `Контекст: ${context || "концерт"}. Выбери ${estimatedCount} песен (~${dur} мин).

Библиотека:
${songList}

Выбирай ТОЛЬКО из списка. Раздели: Разгрев / Середина / Финал.

JSON:
{"rationale":"2-3 предложения: логика программы для этого контекста","recommendations":[{"name":"...","author":"","section":"Разгрев","reason":"..."}]}`;

  try {
    const text = await callClaude(prompt);
    const parsed = parseJsonResponse(text);

    if (!Array.isArray(parsed.recommendations)) {
      throw new Error("Неверная структура ответа");
    }

    return NextResponse.json({ status: "ok", recommendations: parsed.recommendations, rationale: parsed.rationale ?? "" });
  } catch (err: any) {
    console.error("[api/recommend]", err.message);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
