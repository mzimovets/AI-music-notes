"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocalServer } from "@/hooks/useLocalServer";

const MAIN_SITE = "https://songs.nevsky-sobor.ru";
const DISMISSED_KEY = "online-banner-dismissed-v1";
const CHECK_INTERVAL_MS = 30_000;

export function OnlineBanner() {
  const { isLocal, loading } = useLocalServer();
  const { data: session, status: sessionStatus } = useSession();
  const [hasInternet, setHasInternet] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem(DISMISSED_KEY) === "1"
  );
  const [visible, setVisible] = useState(false);

  // Проверяем интернет через wifi-manager (поле noInternet)
  useEffect(() => {
    if (!isLocal) return;
    const check = async () => {
      try {
        const res = await fetch("/api/wifi-manager");
        if (res.ok) {
          const data = await res.json();
          setHasInternet(data.connected && !data.noInternet);
        }
      } catch {
        setHasInternet(false);
      }
    };
    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isLocal]);

  // Плавное появление
  useEffect(() => {
    if (isLocal && hasInternet && !dismissed && sessionStatus === "authenticated") {
      const t = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isLocal, hasInternet, dismissed, sessionStatus]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  if (loading || !isLocal) return null;
  if (sessionStatus !== "authenticated") return null;
  if (!hasInternet || dismissed) return null;

  const username = (session?.user as any)?.username ?? (session?.user?.name ?? "");
  const siteUrl = username
    ? `${MAIN_SITE}/api/auth/local-signin?username=${encodeURIComponent(username)}&redirect=/`
    : MAIN_SITE;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: "linear-gradient(90deg, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0.06) 100%)",
        borderBottom: "1px solid rgba(59,130,246,0.20)",
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
      <button
        onClick={() => window.open(siteUrl, "_self")}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "none", border: "none", cursor: "pointer",
          padding: 0, flex: 1, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 16 }}>🌐</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
          Интернет доступен
        </span>
        <span style={{ fontSize: 12, color: "#1e40af", opacity: 0.75 }}>
          — перейти в онлайн-режим
        </span>
        <span style={{
          fontSize: 11, color: "#1d4ed8",
          background: "rgba(59,130,246,0.15)",
          borderRadius: 6, padding: "2px 7px", marginLeft: 2, fontWeight: 500,
        }}>
          Открыть →
        </span>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        aria-label="Скрыть"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#1d4ed8", opacity: 0.5, fontSize: 18,
          lineHeight: 1, padding: "4px 2px", flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
