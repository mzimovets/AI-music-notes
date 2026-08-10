import { NextResponse } from "next/server";

/**
 * Возвращает информацию о типе сервера (локальный / основной).
 * Клиент использует этот эндпоинт, чтобы знать, с чем он работает,
 * и показывать соответствующий UI.
 */
export async function GET() {
  const isLocal = process.env.IS_LOCAL_SERVER === "true";
  // CORS для этого маршрута уже настроен в nginx на плате
  // (/etc/nginx/sites-available/nevsky-sobor, вручную, вне репозитория) —
  // добавлять свой заголовок здесь нельзя: два заголовка Access-Control-
  // Allow-Origin в одном ответе браузер трактует как нарушение и отклоняет
  // ответ целиком, что и произошло, когда он был добавлен.
  return NextResponse.json({
    isLocal,
    hostname: isLocal ? (process.env.LOCAL_HOSTNAME || "raspberrypi-songs.local") : null,
  });
}
