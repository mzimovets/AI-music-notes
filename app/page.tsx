"use client";
import { Suspense, useEffect, useState } from "react";

import React from "react";
import Albums from "./home/albums";
import {
  SongsLibraryContextProvider,
  useAllSongsLibraryContextProvider,
} from "./providers";

import { Button } from "@heroui/react";

import { motion, AnimatePresence } from "framer-motion";
import { LoadingCamerton } from "@/components/LoadingCamerton";
import { StackCard } from "./home/StackCard";
import { LeftArrIcon } from "@/components/icons/LeftArrIcon";
import { DownArrIcon } from "@/components/icons/DownArrIcon";
import { Search } from "./home/search/Search";
import { useSession } from "next-auth/react";
import { getBackendBaseUrl } from "@/lib/client-url";
import { socket } from "@/lib/socket";
import { CacheStats } from "@/components/CacheStats";
import { WiFiManagerModal } from "@/components/WiFiManagerModal";
import { useLocalServer } from "@/hooks/useLocalServer";


export default function Home() {
  const albumsPromise = new Promise((resolve) => resolve(null));
  const { allSongs, setAllSongs } = useAllSongsLibraryContextProvider();
  const { data: session } = useSession();
  const [stacks, setStacks] = useState([]);

  // Кэшируем роль в localStorage — кнопка появляется сразу после перезагрузки
  const [cachedRegent, setCachedRegent] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("isRegent") === "true";
  });
  useEffect(() => {
    if (session?.user?.role !== undefined) {
      const regent = session.user.role === "регент";
      setCachedRegent(regent);
      localStorage.setItem("isRegent", String(regent));
    }
  }, [session?.user?.role]);
  const isRegent = cachedRegent || session?.user?.role === "регент";

  const [isLoading, setIsLoading] = useState(false);
  const [showStacks, setShowStacks] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("showStacks") === "true";
  });
  const [isWifiManagerOpen, setIsWifiManagerOpen] = useState(false);
  const [hasFirmwareUpdate, setHasFirmwareUpdate] = useState(false);
  const [hasBoardDanger, setHasBoardDanger] = useState(false);
  const { isLocal, rpiBaseUrl } = useLocalServer();
  const [boardOffline, setBoardOffline] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem("board-offline-v1") === "1"
  );

  // Background firmware check every 30 min
  useEffect(() => {
    if (!isLocal) return;
    const check = async () => {
      try {
        const res = await fetch(`${rpiBaseUrl}/api/git-update`);
        if (res.ok) { const d = await res.json(); setHasFirmwareUpdate(!!d.hasUpdate); }
      } catch {}
    };
    check();
    const t = setInterval(check, 30 * 60_000);
    return () => clearInterval(t);
  }, [isLocal, rpiBaseUrl]);

  // Фоновый опрос опасных состояний платы (undervoltage / thermal throttle прямо сейчас)
  // Работает всегда — независимо от того открыта модалка или нет
  useEffect(() => {
    if (!isLocal) return;
    const check = async () => {
      if (boardOffline) { setHasBoardDanger(false); return; }
      try {
        const res = await fetch(`${rpiBaseUrl}/api/system-status`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const d = await res.json();
          const flags = d.throttleFlags ?? 0;
          setHasBoardDanger(!!(flags & 0x1) || !!(flags & 0xC));
        }
      } catch {}
    };
    check();
    const t = setInterval(check, 5_000);
    return () => clearInterval(t);
  }, [isLocal, rpiBaseUrl, boardOffline]);

  useEffect(() => {
    localStorage.setItem("showStacks", String(showStacks));
  }, [showStacks]);

  useEffect(() => {
    const backUrl = getBackendBaseUrl();

    const SONGS_OFFLINE_KEY = "offline-songs-v1";
    const STACKS_OFFLINE_KEY = "offline-stacks-v1";

    const fetchAllSongs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${backUrl}/songs`, { signal: AbortSignal.timeout(5000) });
        const data = await response.json();

        if (data.status === "ok" && data.docs) {
          const songs = data.docs
            .filter((song) => song.docType === "song")
            .map((song) => ({
              _id: song._id,
              name: song.doc?.name || song.name || "",
              author: song.doc?.author || song.author || "",
              authorLyrics: song.doc?.authorLyrics || song.authorLyrics || "",
              authorArrange:
                song.doc?.authorArrange || song.authorArrange || "",
              category: song.doc?.category || song.category || "",
              file: song.doc?.file || song.file || {},
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "ru"));

          setAllSongs(songs);
          // Сохраняем для офлайн-режима
          try { localStorage.setItem(SONGS_OFFLINE_KEY, JSON.stringify(songs)); } catch {}
        }
      } catch {
        // Офлайн — загружаем из кеша
        try {
          const cached = localStorage.getItem(SONGS_OFFLINE_KEY);
          if (cached) setAllSongs(JSON.parse(cached));
        } catch {}
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAllStacks = async () => {
      try {
        const response = await fetch(`${backUrl}/stacks`, { signal: AbortSignal.timeout(5000) });
        const data = await response.json();

        if (data.status === "ok" && data.docs) {
          setStacks(data.docs);
          try { localStorage.setItem(STACKS_OFFLINE_KEY, JSON.stringify(data.docs)); } catch {}
        }
      } catch {
        // Офлайн — загружаем из кеша
        try {
          const cached = localStorage.getItem(STACKS_OFFLINE_KEY);
          if (cached) setStacks(JSON.parse(cached));
        } catch {}
      }
    };

    fetchAllSongs();
    fetchAllStacks();

    const handleVisibilityChanged = ({
      stackId,
      isPublished,
      deleted,
      stackData,
    }: {
      stackId: string;
      isPublished?: boolean;
      deleted?: boolean;
      stackData?: any;
    }) => {
      if (deleted) {
        setStacks((prev) => prev.filter((s: any) => s._id !== stackId));
      } else if (isPublished === false) {
        setStacks((prev) =>
          prev.map((s: any) =>
            s._id === stackId ? { ...s, isPublished: false } : s,
          ),
        );
      } else if (isPublished === true) {
        setStacks((prev) => {
          const exists = prev.some((s: any) => s._id === stackId);
          if (exists) {
            return prev.map((s: any) =>
              s._id === stackId ? { ...s, isPublished: true } : s,
            );
          }
          return stackData ? [...prev, stackData] : prev;
        });
      }
    };

    socket.on("stack-visibility-changed", handleVisibilityChanged);

    // После синхронизации БД обновляем данные
    const handleDbSync = () => {
      fetchAllSongs();
      fetchAllStacks();
    };
    window.addEventListener("db-sync-complete", handleDbSync);

    return () => {
      socket.off("stack-visibility-changed", handleVisibilityChanged);
      window.removeEventListener("db-sync-complete", handleDbSync);
    };
  }, []);

  return (
    <SongsLibraryContextProvider albumsPromise={albumsPromise}>
      <Search allSongs={allSongs} />

      <>
        <WiFiManagerModal
          isOpen={isWifiManagerOpen}
          onClose={() => setIsWifiManagerOpen(false)}
          onBoardOfflineChange={setBoardOffline}
        />
        {/* Мобильная кнопка WiFi менеджера */}
        <div className="md:hidden fixed bottom-6 left-6 z-50">
          {isRegent && (
            <button
              onClick={() => setIsWifiManagerOpen(true)}
              aria-label="Управление платой"
              className="hover:scale-110 active:scale-95"
              style={{ position: "relative",
                width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: (!isLocal || boardOffline)
                  ? "radial-gradient(circle at 40% 40%, #94a3b8, #64748b)"
                  : "radial-gradient(circle at 40% 40%, #e8457a, #9e1239)",
                boxShadow: (!isLocal || boardOffline)
                  ? "0 4px 14px rgba(100,116,139,0.3)"
                  : "0 0 0 3px rgba(232,69,122,0.25), 0 0 18px rgba(232,69,122,0.5), 0 4px 14px rgba(0,0,0,0.25)",
                transition: "box-shadow 0.3s ease, background 0.3s ease, transform 0.15s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 32 32" fill="rgba(255,255,255,0.95)" xmlns="http://www.w3.org/2000/svg">
                <g><g>
                  <path d="M13.8,6.4c-1.4-1.1-2.9-1.9-4.6-2.5c1.5,0.9,3,1.7,4.2,2.9c-0.1,1.1-1.5,1.8-3.1,1.7c-0.1-0.1,0.1-0.1,0.1-0.3C10,8.1,9.5,8.2,9.2,8c0-0.1,0.2-0.1,0.1-0.2C9,7.6,8.6,7.5,8.3,7.3c0-0.1,0.2-0.1,0.3-0.2c-0.3-0.2-0.7-0.3-1-0.6c0.1-0.1,0.2,0,0.3-0.2C7.6,6.1,7.3,5.9,7.1,5.6c0.1-0.1,0.2,0,0.3-0.1C7.3,5.2,6.9,5,6.8,4.7c0.2,0,0.3,0.1,0.5-0.1C7.1,4.3,6.7,4.2,6.6,3.8c0.1-0.1,0.3,0,0.4-0.1c0-0.3-0.2-0.5-0.3-0.8c0.3-0.1,0.7,0,1-0.1c0-0.1-0.1-0.2-0.1-0.3c0.4-0.2,0.8,0,1.2,0.1c0.1-0.2-0.1-0.2,0-0.4c0.3,0,0.6,0.2,1,0.2C9.9,2.2,9.6,2.2,9.6,2c0.4,0,0.7,0.2,1,0.4c0.1-0.1,0-0.2,0.1-0.4c0.3,0.1,0.5,0.3,0.8,0.5c0.2,0,0.1-0.2,0.2-0.3c0.3,0.1,0.5,0.4,0.7,0.5c0.2,0,0.1-0.2,0.2-0.3c0.3,0.2,0.5,0.5,0.7,0.7c0.2,0,0.1-0.2,0.3-0.2c0.6,0.7,1.2,1.5,1.1,2.5C14.7,5.9,14.3,6.2,13.8,6.4z"/>
                  <path d="M23.5,7.1c0.1,0.1,0.2,0.1,0.3,0.1c-0.3,0.3-0.7,0.3-1.1,0.5c0,0.1,0.1,0.1,0.1,0.2c-0.3,0.2-0.8,0.1-1.1,0.2c-0.1,0.1,0.1,0.2,0,0.3c-0.4,0.1-0.8,0-1.3-0.1c-0.9-0.2-1.6-0.6-1.9-1.5c1.2-1.3,2.7-2.1,4.2-2.9c-1.7,0.6-3.2,1.4-4.6,2.4c-0.6-0.2-0.9-0.7-0.9-1.3c0-0.7,0.6-1.8,1.2-2.3l0.2,0.3c0.3-0.2,0.5-0.6,0.8-0.7c0.1,0.1,0,0.3,0.2,0.3c0.2-0.1,0.4-0.4,0.7-0.5c0.1,0.1,0,0.2,0.2,0.3C20.8,2.4,21,2.1,21.4,2c0,0.1-0.1,0.2,0,0.4C21.7,2.2,22,2,22.4,2c0,0.1-0.2,0.2-0.1,0.4c0.3,0,0.6-0.2,1-0.2c0,0.1-0.1,0.2,0,0.4c0.4-0.1,0.8-0.2,1.2-0.1c0,0.1-0.1,0.2-0.1,0.3c0.3,0.1,0.7,0,1,0.1C25.3,3.2,25,3.4,25,3.7c0.1,0.1,0.3,0,0.4,0.1c-0.1,0.4-0.5,0.5-0.6,0.8c0.1,0.2,0.3,0,0.4,0.1c-0.1,0.3-0.5,0.5-0.7,0.8c0.1,0.2,0.2,0.1,0.3,0.1c-0.2,0.3-0.5,0.4-0.7,0.7c0.1,0.1,0.2,0.1,0.3,0.2C24.2,6.8,23.8,6.9,23.5,7.1z"/>
                </g><g>
                  <path d="M15.4,16c0,1.8-1.4,3.6-3.2,4c-1.8,0.4-3.4-0.9-3.5-2.7c-0.1-1.8,1.2-3.6,2.9-4C13.7,12.7,15.4,14,15.4,16z"/>
                  <path d="M23.4,16.9c0,2.1-1.8,3.4-3.8,2.8c-1.8-0.6-3.1-2.5-2.8-4.4c0.3-1.8,2.1-2.9,3.9-2.2C22.3,13.7,23.4,15.3,23.4,16.9z"/>
                  <path d="M16.1,19.4c1,0,2,0.4,2.7,1.2c1.2,1.3,1.1,3.2-0.2,4.3c-1.3,1.1-3.4,1.2-4.7,0.1c-1-0.8-1.4-1.8-1.2-3.1c0.3-1.3,1.2-2,2.4-2.4C15.4,19.5,15.7,19.4,16.1,19.4z"/>
                  <path d="M19.8,25.3c0.1-1,0.5-2,1.3-2.9c0.5-0.5,1-1,1.5-1.4c0.3-0.2,0.6-0.3,0.9-0.4c0.6-0.1,1.1,0.1,1.3,0.7c0.4,1,0.5,2,0,3c-0.6,1.4-1.7,2.3-3.2,2.6c-0.1,0-0.3,0-0.5,0C20.2,27,19.8,26.6,19.8,25.3z"/>
                  <path d="M6.9,22.7c0,0,0-0.2,0-0.3c0.1-1.1,0.7-1.5,1.8-1.2c1.7,0.5,3.3,2.5,3.4,4.3c0,1.1-0.5,1.6-1.6,1.4c-1.5-0.2-2.5-1-3.1-2.3C7,24,6.9,23.4,6.9,22.7z"/>
                  <path d="M16.2,12.8c-0.8,0-1.6-0.1-2.3-0.5c-1.3-0.7-1.3-1.6-0.2-2.4c1.5-1.1,3.5-1,4.9,0.2c0.1,0.1,0.2,0.2,0.3,0.3c0.5,0.6,0.4,1.2-0.2,1.7c-0.5,0.4-1.1,0.5-1.7,0.6C16.7,12.8,16.4,12.8,16.2,12.8z"/>
                  <path d="M16,30c-1.2,0-2.2-0.5-3.1-1.4c-0.4-0.4-0.4-0.8,0.1-1.1c0.7-0.4,1.4-0.6,2.2-0.7c1-0.1,2-0.1,3,0.2c0.2,0.1,0.5,0.2,0.7,0.3c0.6,0.3,0.7,0.6,0.2,1.2C18.3,29.5,17.3,30,16,30z"/>
                  <path d="M7.8,16.8c0,1.1-0.2,2.1-0.6,3.1c-0.1,0.3-0.2,0.5-0.4,0.7C6.5,21,6.3,21,6,20.7c-1.4-1.4-1.2-4.1,0.5-5.3c0.6-0.5,1-0.4,1.2,0.4C7.7,16.1,7.8,16.5,7.8,16.8z"/>
                  <path d="M26.9,18.3c0,0.8-0.3,1.7-0.9,2.4c-0.3,0.3-0.5,0.3-0.8,0c-0.3-0.4-0.5-0.9-0.6-1.4c-0.3-1-0.4-2.1-0.3-3.2c0-0.2,0.1-0.5,0.2-0.7c0.2-0.4,0.4-0.5,0.8-0.2C26.3,15.8,26.9,16.9,26.9,18.3z"/>
                </g></g>
              </svg>
              {hasBoardDanger && !boardOffline && (
                <span style={{ position: "absolute", top: 2, left: 2, width: 10, height: 10, borderRadius: "50%", background: "#ef4444", border: "2px solid white", boxShadow: "0 0 6px rgba(239,68,68,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color: "white", lineHeight: 1 }}>!</span>
              )}
              {hasFirmwareUpdate && !boardOffline && (
                <span style={{ position: "absolute", top: 2, right: 2, width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", border: "2px solid white", boxShadow: "0 0 6px rgba(245,158,11,0.7)" }} />
              )}
            </button>
          )}
        </div>

        {/* Десктопная кнопка WiFi менеджера */}
        <div className="hidden md:flex fixed bottom-6 left-6 z-50">
          {isRegent && (
            <button
              onClick={() => setIsWifiManagerOpen(true)}
              aria-label="Управление платой"
              className="hover:scale-110 active:scale-95"
              style={{ position: "relative",
                width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: (!isLocal || boardOffline)
                  ? "radial-gradient(circle at 40% 40%, #94a3b8, #64748b)"
                  : "radial-gradient(circle at 40% 40%, #e8457a, #9e1239)",
                boxShadow: (!isLocal || boardOffline)
                  ? "0 4px 14px rgba(100,116,139,0.3)"
                  : "0 0 0 3px rgba(232,69,122,0.25), 0 0 18px rgba(232,69,122,0.5), 0 4px 14px rgba(0,0,0,0.25)",
                transition: "box-shadow 0.3s ease, background 0.3s ease, transform 0.15s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 32 32" fill="rgba(255,255,255,0.95)" xmlns="http://www.w3.org/2000/svg">
                <g><g>
                  <path d="M13.8,6.4c-1.4-1.1-2.9-1.9-4.6-2.5c1.5,0.9,3,1.7,4.2,2.9c-0.1,1.1-1.5,1.8-3.1,1.7c-0.1-0.1,0.1-0.1,0.1-0.3C10,8.1,9.5,8.2,9.2,8c0-0.1,0.2-0.1,0.1-0.2C9,7.6,8.6,7.5,8.3,7.3c0-0.1,0.2-0.1,0.3-0.2c-0.3-0.2-0.7-0.3-1-0.6c0.1-0.1,0.2,0,0.3-0.2C7.6,6.1,7.3,5.9,7.1,5.6c0.1-0.1,0.2,0,0.3-0.1C7.3,5.2,6.9,5,6.8,4.7c0.2,0,0.3,0.1,0.5-0.1C7.1,4.3,6.7,4.2,6.6,3.8c0.1-0.1,0.3,0,0.4-0.1c0-0.3-0.2-0.5-0.3-0.8c0.3-0.1,0.7,0,1-0.1c0-0.1-0.1-0.2-0.1-0.3c0.4-0.2,0.8,0,1.2,0.1c0.1-0.2-0.1-0.2,0-0.4c0.3,0,0.6,0.2,1,0.2C9.9,2.2,9.6,2.2,9.6,2c0.4,0,0.7,0.2,1,0.4c0.1-0.1,0-0.2,0.1-0.4c0.3,0.1,0.5,0.3,0.8,0.5c0.2,0,0.1-0.2,0.2-0.3c0.3,0.1,0.5,0.4,0.7,0.5c0.2,0,0.1-0.2,0.2-0.3c0.3,0.2,0.5,0.5,0.7,0.7c0.2,0,0.1-0.2,0.3-0.2c0.6,0.7,1.2,1.5,1.1,2.5C14.7,5.9,14.3,6.2,13.8,6.4z"/>
                  <path d="M23.5,7.1c0.1,0.1,0.2,0.1,0.3,0.1c-0.3,0.3-0.7,0.3-1.1,0.5c0,0.1,0.1,0.1,0.1,0.2c-0.3,0.2-0.8,0.1-1.1,0.2c-0.1,0.1,0.1,0.2,0,0.3c-0.4,0.1-0.8,0-1.3-0.1c-0.9-0.2-1.6-0.6-1.9-1.5c1.2-1.3,2.7-2.1,4.2-2.9c-1.7,0.6-3.2,1.4-4.6,2.4c-0.6-0.2-0.9-0.7-0.9-1.3c0-0.7,0.6-1.8,1.2-2.3l0.2,0.3c0.3-0.2,0.5-0.6,0.8-0.7c0.1,0.1,0,0.3,0.2,0.3c0.2-0.1,0.4-0.4,0.7-0.5c0.1,0.1,0,0.2,0.2,0.3C20.8,2.4,21,2.1,21.4,2c0,0.1-0.1,0.2,0,0.4C21.7,2.2,22,2,22.4,2c0,0.1-0.2,0.2-0.1,0.4c0.3,0,0.6-0.2,1-0.2c0,0.1-0.1,0.2,0,0.4c0.4-0.1,0.8-0.2,1.2-0.1c0,0.1-0.1,0.2-0.1,0.3c0.3,0.1,0.7,0,1,0.1C25.3,3.2,25,3.4,25,3.7c0.1,0.1,0.3,0,0.4,0.1c-0.1,0.4-0.5,0.5-0.6,0.8c0.1,0.2,0.3,0,0.4,0.1c-0.1,0.3-0.5,0.5-0.7,0.8c0.1,0.2,0.2,0.1,0.3,0.1c-0.2,0.3-0.5,0.4-0.7,0.7c0.1,0.1,0.2,0.1,0.3,0.2C24.2,6.8,23.8,6.9,23.5,7.1z"/>
                </g><g>
                  <path d="M15.4,16c0,1.8-1.4,3.6-3.2,4c-1.8,0.4-3.4-0.9-3.5-2.7c-0.1-1.8,1.2-3.6,2.9-4C13.7,12.7,15.4,14,15.4,16z"/>
                  <path d="M23.4,16.9c0,2.1-1.8,3.4-3.8,2.8c-1.8-0.6-3.1-2.5-2.8-4.4c0.3-1.8,2.1-2.9,3.9-2.2C22.3,13.7,23.4,15.3,23.4,16.9z"/>
                  <path d="M16.1,19.4c1,0,2,0.4,2.7,1.2c1.2,1.3,1.1,3.2-0.2,4.3c-1.3,1.1-3.4,1.2-4.7,0.1c-1-0.8-1.4-1.8-1.2-3.1c0.3-1.3,1.2-2,2.4-2.4C15.4,19.5,15.7,19.4,16.1,19.4z"/>
                  <path d="M19.8,25.3c0.1-1,0.5-2,1.3-2.9c0.5-0.5,1-1,1.5-1.4c0.3-0.2,0.6-0.3,0.9-0.4c0.6-0.1,1.1,0.1,1.3,0.7c0.4,1,0.5,2,0,3c-0.6,1.4-1.7,2.3-3.2,2.6c-0.1,0-0.3,0-0.5,0C20.2,27,19.8,26.6,19.8,25.3z"/>
                  <path d="M6.9,22.7c0,0,0-0.2,0-0.3c0.1-1.1,0.7-1.5,1.8-1.2c1.7,0.5,3.3,2.5,3.4,4.3c0,1.1-0.5,1.6-1.6,1.4c-1.5-0.2-2.5-1-3.1-2.3C7,24,6.9,23.4,6.9,22.7z"/>
                  <path d="M16.2,12.8c-0.8,0-1.6-0.1-2.3-0.5c-1.3-0.7-1.3-1.6-0.2-2.4c1.5-1.1,3.5-1,4.9,0.2c0.1,0.1,0.2,0.2,0.3,0.3c0.5,0.6,0.4,1.2-0.2,1.7c-0.5,0.4-1.1,0.5-1.7,0.6C16.7,12.8,16.4,12.8,16.2,12.8z"/>
                  <path d="M16,30c-1.2,0-2.2-0.5-3.1-1.4c-0.4-0.4-0.4-0.8,0.1-1.1c0.7-0.4,1.4-0.6,2.2-0.7c1-0.1,2-0.1,3,0.2c0.2,0.1,0.5,0.2,0.7,0.3c0.6,0.3,0.7,0.6,0.2,1.2C18.3,29.5,17.3,30,16,30z"/>
                  <path d="M7.8,16.8c0,1.1-0.2,2.1-0.6,3.1c-0.1,0.3-0.2,0.5-0.4,0.7C6.5,21,6.3,21,6,20.7c-1.4-1.4-1.2-4.1,0.5-5.3c0.6-0.5,1-0.4,1.2,0.4C7.7,16.1,7.8,16.5,7.8,16.8z"/>
                  <path d="M26.9,18.3c0,0.8-0.3,1.7-0.9,2.4c-0.3,0.3-0.5,0.3-0.8,0c-0.3-0.4-0.5-0.9-0.6-1.4c-0.3-1-0.4-2.1-0.3-3.2c0-0.2,0.1-0.5,0.2-0.7c0.2-0.4,0.4-0.5,0.8-0.2C26.3,15.8,26.9,16.9,26.9,18.3z"/>
                </g></g>
              </svg>
              {hasBoardDanger && !boardOffline && (
                <span style={{ position: "absolute", top: 2, left: 2, width: 10, height: 10, borderRadius: "50%", background: "#ef4444", border: "2px solid white", boxShadow: "0 0 6px rgba(239,68,68,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color: "white", lineHeight: 1 }}>!</span>
              )}
              {hasFirmwareUpdate && !boardOffline && (
                <span style={{ position: "absolute", top: 2, right: 2, width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", border: "2px solid white", boxShadow: "0 0 6px rgba(245,158,11,0.7)" }} />
              )}
            </button>
          )}
        </div>
      </>

      {/* Stacks.tsx */}
      {(isRegent ? stacks.length > 0 : stacks.some((s) => s.isPublished)) && (
        <div className="pb-0 flex items-center font-header gap-4 mt-8">
          {/* Оборачиваем текст в span с курсором */}
          <div
            onClick={() => setShowStacks((prev) => !prev)}
            className="leading-none cursor-pointer select-none"
          >
            Стопки
          </div>

          {stacks.length > 4 && (
            <Button
              isIconOnly
              type="button"
              onPress={(e) => {
                setShowStacks((prev) => !prev);
              }}
              //           className="
              //   flex items-center justify-center
              //   h-8 w-8 p-0
              //   bg-transparent border-none shadow-none
              //   text-black
              //   transition-transform duration-200
              //   hover:scale-110
              //   focus:outline-none
              //   active:outline-none
              // "
              aria-label={showStacks ? "Скрыть стопки" : "Показать стопки"}
            >
              {showStacks ? (
                <DownArrIcon width={18} height={18} className="text-black" />
              ) : (
                <LeftArrIcon width={18} height={18} className="text-black" />
              )}
            </Button>
          )}
        </div>
      )}
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-2">
        <AnimatePresence initial={false}>
          {(showStacks || stacks.length <= 4) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden w-full"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <StackCard stacks={stacks} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {/*End Stacks.tsx */}

      <div className="pb-0 flex flex-col font-header gap-4 mt-8">Песни</div>
      {/* <LoadingCamerton /> */}
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-2">
        <Suspense>
          <Albums />
        </Suspense>
      </section>

      <CacheStats songsCount={allSongs.length} stacksCount={stacks.length} />
    </SongsLibraryContextProvider>
  );
}
