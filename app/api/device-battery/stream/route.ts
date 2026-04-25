import { NextRequest } from "next/server";
import { getAll } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      // Отправляем текущее состояние сразу при подключении
      send(getAll());

      // Подписываемся на обновления
      globalThis.batteryEmitter?.on("update", send);

      // Отписываемся когда клиент отключается
      req.signal.addEventListener("abort", () => {
        globalThis.batteryEmitter?.off("update", send);
        try { controller.close(); } catch {}
      });
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
