"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useBoardDetect } from "@/hooks/useBoardDetect";
import { useLocalServer } from "@/hooks/useLocalServer";

export function BoardBanner() {
  const { isLocal, loading: localLoading } = useLocalServer();
  const { boardAvailable } = useBoardDetect();
  const { data: session, status: sessionStatus } = useSession();

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const devMode = typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("board") === "1";
    if ((devMode || boardAvailable) && !isLocal && sessionStatus === "authenticated") {
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [boardAvailable, isLocal, sessionStatus]);

  const devMode = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("board") === "1";

  if (localLoading || isLocal) return null;
  if (sessionStatus !== "authenticated") return null;
  if (!devMode && !boardAvailable) return null;

  const username = (session?.user as any)?.username ?? (session?.user?.name ?? "");
  const boardUrl = username
    ? `https://raspberrypi-songs.local/api/auth/local-signin?username=${encodeURIComponent(username)}&redirect=/`
    : "https://raspberrypi-songs.local";

  return (
    <div
      style={{
        width: "100%",
        background: "linear-gradient(90deg, rgba(22,163,74,0.10) 0%, rgba(22,163,74,0.06) 100%)",
        borderBottom: "1px solid rgba(22,163,74,0.20)",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        height: visible ? 44 : 0,
        overflow: "hidden",
        transition: "height 0.3s ease",
        fontFamily: "Roboto Slab, serif",
      }}
      role="banner"
    >
      <button
        onClick={() => window.open(boardUrl, "_self")}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "none", border: "none", cursor: "pointer",
          padding: 0, flex: 1, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 16 }}>📡</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>Плата рядом</span>
        <span style={{ fontSize: 12, color: "#166534", opacity: 0.75 }}>— перейти в автономный режим</span>
        <span style={{
          fontSize: 11, color: "#15803d",
          background: "rgba(22,163,74,0.15)",
          borderRadius: 6, padding: "2px 7px", marginLeft: 2, fontWeight: 500,
        }}>
          Открыть →
        </span>
      </button>
    </div>
  );
}
