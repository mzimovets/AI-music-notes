import { NextRequest, NextResponse } from "next/server";

const MODEL = "claude-sonnet-4-6";

function parseJsonResponse(text: string) {
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error("[sort-program] raw text was:", JSON.stringify(text));
    throw new Error("Нет JSON в ответе модели");
  }
  return JSON.parse(match[0]);
}

async function callClaude(prompt: string): Promise<string> {
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
      max_tokens: 1200,
      system: "Отвечай ТОЛЬКО валидным JSON. Никаких инструментов, поиска, пояснений.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const raw = await res.text();
  console.log("[sort-program] HTTP status:", res.status);
  console.log("[sort-program] raw response:", raw.slice(0, 300));

  const data = JSON.parse(raw);

  if (data?.content?.[0]?.text) return data.content[0].text;
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

  const { songNames, context } = body as { songNames?: string[]; context?: string };

  if (!songNames || !Array.isArray(songNames) || songNames.length === 0) {
    return NextResponse.json(
      { status: "error", message: "Список песнопений не передан" },
      { status: 400 }
    );
  }

  const numbered = songNames.map((n, i) => `${i + 1}. ${n}`).join("\n");

  const prompt = `Контекст: ${context || "концерт"}. Выстрой в порядок: Разгрев → Середина → Финал.

Песни:
${numbered}

JSON:
{"sorted":[{"name":"...","section":"Разгрев","reason":"..."}]}`;

  try {
    const text = await callClaude(prompt);
    const parsed = parseJsonResponse(text);

    if (!Array.isArray(parsed.sorted)) {
      throw new Error("Неверная структура ответа");
    }

    return NextResponse.json({ status: "ok", sorted: parsed.sorted });
  } catch (err: any) {
    console.error("[api/sort-program]", err.message);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
