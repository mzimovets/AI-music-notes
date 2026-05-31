import { NextResponse } from "next/server";

/**
 * Возвращает информацию о типе сервера (локальный / основной).
 * Клиент использует этот эндпоинт, чтобы знать, с чем он работает,
 * и показывать соответствующий UI.
 */
export async function GET() {
  const isLocal = process.env.IS_LOCAL_SERVER === "true";
  return NextResponse.json({
    isLocal,
    hostname: isLocal ? (process.env.LOCAL_HOSTNAME || "raspberrypi-songs.local") : null,
  });
}
