import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";

function parseJsonResponse(text: string) {
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Нет JSON в ответе модели");
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { status: "error", message: "ANTHROPIC_API_KEY не задан на сервере" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ status: "error", message: "Неверный JSON" }, { status: 400 });

  const { context, durationMinutes, songs } = body as {
    context?: string;
    durationMinutes?: number;
    songs?: { name: string; category?: string; aiSummary?: { mood?: string; description?: string; tags?: string[] } | null }[];
  };

  if (!songs || !Array.isArray(songs) || songs.length === 0) {
    return Response.json({ status: "error", message: "Список песнопений не передан" }, { status: 400 });
  }

  const dur = Number(durationMinutes) || 60;
  const estimatedCount = Math.max(1, Math.round(dur / 3));

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      try {
        send({ type: "progress", text: `Анализирую библиотеку: ${Math.min(songs.length, 70)} произведений` });

        const baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
        const apiKey = process.env.ANTHROPIC_API_KEY!;

        send({ type: "progress", text: "Подбираю репертуар…" });

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
            stream: true,
            system: [
              "Ты — помощник по составлению концертных программ.",
              "Отвечай ТОЛЬКО валидным JSON-объектом без каких-либо пояснений, markdown или других слов.",
              "КРИТИЧНО: используй названия песен ТОЧНО так, как они написаны в библиотеке — не изменяй, не сокращай, не добавляй слова.",
            ].join(" "),
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
        }

        send({ type: "progress", text: "Формирую программу…" });

        let fullText = "";
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });

          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") continue;
            try {
              const event = JSON.parse(raw);
              if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                fullText += event.delta.text;
                send({ type: "chunk", text: event.delta.text });
              }
            } catch {}
          }
        }

        const parsed = parseJsonResponse(fullText);
        if (!Array.isArray(parsed.recommendations)) throw new Error("Неверная структура ответа");

        send({ type: "result", recommendations: parsed.recommendations, rationale: parsed.rationale ?? "" });
      } catch (err: any) {
        send({ type: "error", message: err.message });
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
