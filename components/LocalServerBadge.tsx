"use client";
import { useLocalServer } from "@/hooks/useLocalServer";

/**
 * Показывает:
 * - На RPi: зелёный бейдж «📡 Локальный сервер»
 * - На основном сайте: ссылку «Подключиться к плате»
 *   (открывается в браузере пользователя вручную, т.к. mixed-content с HTTPS→HTTP
 *    нельзя обойти автоматически)
 */
export function LocalServerBadge() {
  const { isLocal, hostname, loading } = useLocalServer();

  if (loading) return null;

  if (isLocal) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold select-none"
          style={{
            background: "rgba(22, 163, 74, 0.10)",
            color: "#15803d",
            border: "1px solid rgba(22, 163, 74, 0.25)",
            fontFamily: "Roboto Slab, serif",
          }}
          title="Приложение работает с локальным сервером на Raspberry Pi"
        >
          <span style={{ fontSize: 10 }}>📡</span>
          <span>Локальный сервер</span>
        </div>
        <a
          href="https://songs.nevsky-sobor.ru"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
          style={{
            background: "rgba(99, 102, 241, 0.08)",
            color: "#4338ca",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            fontFamily: "Roboto Slab, serif",
            textDecoration: "none",
          }}
          title="Открыть основной сайт"
        >
          <span style={{ fontSize: 10 }}>🌐</span>
          <span>Основной сайт</span>
        </a>
      </div>
    );
  }

  // Основной сайт — показываем ссылку на локальный сервер
  const localUrl = `http://${hostname || "raspberrypi-songs.local"}`;
  return (
    <a
      href={localUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
      style={{
        background: "rgba(99, 102, 241, 0.08)",
        color: "#4338ca",
        border: "1px solid rgba(99, 102, 241, 0.2)",
        fontFamily: "Roboto Slab, serif",
        textDecoration: "none",
      }}
      title={`Открыть приложение на локальном сервере (${localUrl})`}
    >
      <span style={{ fontSize: 10 }}>🔗</span>
      <span>Открыть на плате</span>
    </a>
  );
}
