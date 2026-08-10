import { NextResponse } from "next/server";

/**
 * Возвращает информацию о типе сервера (локальный / основной).
 * Клиент использует этот эндпоинт, чтобы знать, с чем он работает,
 * и показывать соответствующий UI.
 */
export async function GET() {
  const isLocal = process.env.IS_LOCAL_SERVER === "true";
  return NextResponse.json(
    {
      isLocal,
      hostname: isLocal ? (process.env.LOCAL_HOSTNAME || "raspberrypi-songs.local") : null,
    },
    // Приложение обычно загружено с songs.nevsky-sobor.ru, а этот запрос
    // идёт на raspberrypi-songs.local — с точки зрения браузера это разные
    // источники (CORS). Без заголовка ниже прямой заход в браузере работал,
    // а из приложения ответ браузер тихо отбрасывал.
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
