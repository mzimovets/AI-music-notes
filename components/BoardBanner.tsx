"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useBoardDetect } from "@/hooks/useBoardDetect";
import { useLocalServer } from "@/hooks/useLocalServer";

const BOARD_URL = "https://raspberrypi-songs.local";

/**
 * Показывается ТОЛЬКО на основном сайте (songs.nevsky-sobor.ru),
 * когда плата обнаружена в локальной сети.
 *
 * При нажатии — переходит на https://raspberrypi-songs.local
 * (то же приложение, но напрямую с платы).
 */
export function BoardBanner() {
  const { isLocal, loading: localLoading } = useLocalServer();
  const { boardAvailable, dismissed, dismiss } = useBoardDetect();
  const { data: session, status: sessionStatus } = useSession();

  // Плавное появление
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const devMode = typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("board") === "1";
    if ((devMode || boardAvailable) && !dismissed && !isLocal && sessionStatus === "authenticated") {
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [boardAvailable, dismissed, isLocal, sessionStatus]);

  // dev-режим: ?board=1 в URL принудительно показывает баннер
  const devMode = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("board") === "1";

  // Не рендерим на плате, пока грузится, или если не авторизован
  if (localLoading || isLocal) return null;
  if (sessionStatus !== "authenticated") return null;
  if (!devMode && (!boardAvailable || dismissed)) return null;

  // Передаём роль пользователя в URL — плата автоматически залогинит
  const username = (session?.user as any)?.username ?? (session?.user?.name ?? "");
  const boardUrl = username
    ? `https://raspberrypi-songs.local/api/auth/local-signin?username=${encodeURIComponent(username)}&redirect=/`
    : "https://raspberrypi-songs.local";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: "linear-gradient(90deg, rgba(22,163,74,0.10) 0%, rgba(22,163,74,0.06) 100%)",
        borderBottom: "1px solid rgba(22,163,74,0.20)",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        height: visible ? 44 : 0,
        overflow: "hidden",
        transition: "height 0.3s ease",
        fontFamily: "Roboto Slab, serif",
      }}
      role="banner"
    >
      {/* Левая часть — кнопка перехода */}
      <button
        onClick={() => window.open(boardUrl, "_self")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          flex: 1,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 16 }}>📡</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>
          Плата рядом
        </span>
        <span style={{ fontSize: 12, color: "#166534", opacity: 0.75 }}>
          — перейти в автономный режим
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#15803d",
            background: "rgba(22,163,74,0.15)",
            borderRadius: 6,
            padding: "2px 7px",
            marginLeft: 2,
            fontWeight: 500,
          }}
        >
          Открыть →
        </span>
      </button>

      {/* Правая часть — закрыть */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        aria-label="Скрыть"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#15803d",
          opacity: 0.5,
          fontSize: 18,
          lineHeight: 1,
          padding: "4px 2px",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
