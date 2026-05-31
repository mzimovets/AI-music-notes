"use client";

import { Modal, ModalContent } from "@heroui/modal";
import { Chip } from "@heroui/chip";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import React, { useEffect, useState, useCallback, useRef } from "react";

interface Props { isOpen: boolean; onClose: () => void; }

// ── Types ──────────────────────────────────────────────────────────────────────
interface WifiStatus {
  ok: boolean; ssid: string; ip: string; connected: boolean;
  apDevices?: number; apActive?: boolean;
  savedNetworks?: { id: string; ssid: string }[];
  noInternet?: boolean;
}
interface Network { ssid: string; signal: number; security: string; inUse: boolean; }
interface SysData {
  temp: number; fanRpm: number; cpuPercent: number;
  ramUsed: number; ramTotal: number; uptime: string;
  wlan1Signal: number; throttled: boolean;
  wlan1LinkMbps?: number;
  wlan0RxBps: number; wlan0TxBps: number;
  wlan1RxBps: number; wlan1TxBps: number;
  voltageCore?: number; voltageSdram?: number;
  clockArmMhz?: number; cpuGovernor?: string;
  throttleFlags?: number;
}
interface SyncLogEntry { ts: number; level: "info" | "warn" | "error"; line: string; }
interface SyncResult { ok: boolean; error?: string; duration: number; logs: SyncLogEntry[]; startedAt: number; }
interface UpdateInfo {
  hasUpdate?: boolean; error?: string;
  processStatus?: "idle" | "running" | "restarting" | "done";
  remote?: { sha: string; message: string; date: string };
  localSha?: string;
  recentCommits?: { sha: string; message: string; date: string }[];
}
interface SyncHistoryEntry {
  timestamp: number;
  added: { title: string; type: string }[];
  updated: { title: string; type: string }[];
  deleted: { title: string; type: string }[];
  duration: number;
}
type Tab = "system" | "power" | "network" | "firmware";

// ── Fan SVG ────────────────────────────────────────────────────────────────────
function FanIcon({ rpm }: { rpm: number }) {
  const duration = rpm > 100 ? `${Math.max(0.08, 6000 / rpm).toFixed(2)}s` : undefined;
  return (
    <svg
      viewBox="0 0 24 24" width="36" height="36"
      className={duration ? "animate-spin" : ""}
      style={duration ? { animationDuration: duration } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" fill="none"/>
      <path fill="#BD9673" d="M12,11a1,1,0,1,0,1,1,1,1,0,0,0-1-1m.5-9C17,2,17.1,5.57,14.73,6.75a3.36,3.36,0,0,0-1.62,2.47,3.17,3.17,0,0,1,1.23.91C18,8.13,22,8.92,22,12.5c0,4.5-3.58,4.6-4.75,2.23a3.44,3.44,0,0,0-2.5-1.62,3.24,3.24,0,0,1-.91,1.23c2,3.69,1.2,7.66-2.38,7.66C7,22,6.89,18.42,9.26,17.24a3.46,3.46,0,0,0,1.62-2.45,3,3,0,0,1-1.25-.92C5.94,15.85,2,15.07,2,11.5,2,7,5.54,6.89,6.72,9.26A3.39,3.39,0,0,0,9.2,10.87a2.91,2.91,0,0,1,.92-1.22C8.13,6,8.92,2,12.48,2Z"/>
    </svg>
  );
}

// ── Signal bars ────────────────────────────────────────────────────────────────
function SignalBars({ signal, size = 14 }: { signal: number; size?: number }) {
  const bars = signal >= 75 ? 4 : signal >= 50 ? 3 : signal >= 25 ? 2 : 1;
  const color = signal >= 60 ? "#4ade80" : signal >= 30 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
      {[1, 2, 3, 4].map((b) => (
        <div key={b} style={{
          width: size * 0.22, height: size * 0.25 + b * size * 0.2,
          background: b <= bars ? color : "rgba(0,0,0,0.1)", borderRadius: 2,
        }} />
      ))}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ height: 5, background: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden", flex: 1 }}>
      <div style={{
        height: "100%", width: `${pct}%`, borderRadius: 3,
        background: color, transition: "width 0.5s ease",
      }} />
    </div>
  );
}

// ── Password input ─────────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, onKeyDown, error, placeholder = "Пароль" }: {
  value: string; onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  error?: string | null; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onFocus = () => {
    setTimeout(() => {
      const panel = inputRef.current?.closest("[data-expand-panel]");
      panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 250);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type={show ? "text" : "password"} placeholder={placeholder} value={value} autoFocus
          onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} onFocus={onFocus}
          className="input-header"
          style={{
            width: "100%", padding: "9px 36px 9px 12px", borderRadius: 9,
            border: error ? "1.5px solid rgba(248,113,113,0.7)" : "1.5px solid rgba(0,0,0,0.09)",
            background: error ? "rgba(255,235,235,0.8)" : "rgba(255,255,255,0.9)",
            fontSize: 14, color: "#2d2015", outline: "none", boxSizing: "border-box",
          }}
        />
        <button type="button" onClick={() => setShow((v) => !v)} style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          color: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center",
        }}>
          {show ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>
      {error && <span className="input-header" style={{ fontSize: 11, color: "#dc2626", paddingLeft: 4 }}>{error}</span>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function WiFiManagerModal({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("system");

  // System
  const [sysData, setSysData] = useState<SysData | null>(null);
  const sysTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [boardOffline, setBoardOffline] = useState(false);

  // WiFi
  const [status, setStatus] = useState<WifiStatus | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [noInternet, setNoInternet] = useState(false);
  const [forgetting, setForgetting] = useState<string | null>(null);
  const statusTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScanRef = useRef<number>(0);
  const lastFirmwareCheckRef = useRef<number>(0);

  // Firmware
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [updateDone, setUpdateDone] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStage, setUpdateStage] = useState("");
  const [updateStartedAt, setUpdateStartedAt] = useState<number>(0);
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);
  const [firmwareLogOpen, setFirmwareLogOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(0);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const syncPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Toast
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── System polling ───────────────────────────────────────────────────────────
  const fetchSys = useCallback(async () => {
    try {
      const res = await fetch("/api/system-status");
      if (res.ok) setSysData(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) { if (sysTimer.current) clearInterval(sysTimer.current); return; }
    fetchSys();
    sysTimer.current = setInterval(fetchSys, 3_000);
    return () => { if (sysTimer.current) clearInterval(sysTimer.current); };
  }, [isOpen, fetchSys]);

  const handleBoardOffline = useCallback(() => {
    if (sysTimer.current) clearInterval(sysTimer.current);
    setSysData(null);
    setBoardOffline(true);
    setTab("system"); // принудительно переключаем на системную вкладку
  }, []);

  // ── WiFi status polling ──────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/wifi-manager");
      if (res.ok) setStatus(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) { if (statusTimer.current) clearInterval(statusTimer.current); return; }
    fetchStatus();
    statusTimer.current = setInterval(fetchStatus, 15_000);
    return () => { if (statusTimer.current) clearInterval(statusTimer.current); };
  }, [isOpen, fetchStatus]);

  // ── Firmware check ───────────────────────────────────────────────────────────
  const checkUpdate = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/git-update");
      const data = await res.json();
      setUpdateInfo(data);
      setCommitOpen(false);
    } catch { setUpdateInfo({ error: "Нет соединения" }); }
    finally { setChecking(false); }
  }, []);

  useEffect(() => {
    if (!isOpen) { if (checkTimer.current) clearInterval(checkTimer.current); return; }
    checkUpdate();
    checkTimer.current = setInterval(checkUpdate, 30 * 60_000);
    return () => { if (checkTimer.current) clearInterval(checkTimer.current); };
  }, [isOpen, checkUpdate]);

  // ── Poll sync status every 5 min ─────────────────────────────────────────────
  const fetchSyncStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/update-db");
      if (!r.ok) return;
      const d = await r.json();
      if (d?.lastSyncedAt) setLastSyncedAt(d.lastSyncedAt);
      if (d?.history) setSyncHistory(d.history);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) { if (syncPollTimer.current) clearInterval(syncPollTimer.current); return; }
    fetchSyncStatus();
    syncPollTimer.current = setInterval(fetchSyncStatus, 5 * 60_000);
    return () => { if (syncPollTimer.current) clearInterval(syncPollTimer.current); };
  }, [isOpen, fetchSyncStatus]);

  // ── Reset on close ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setNetworks([]); setSelectedSsid(null); setPassword("");
      setConnectError(null); setEditingId(null); setEditPassword("");
      setSyncResult(null); setLogOpen(false); setCommitOpen(false);
      setUpdateDone(false); setNoInternet(false);
      setScanDone(false); lastScanRef.current = 0;
      // Сбрасываем состояние обновления прошивки — иначе при повторном открытии виден застрявший прогресс
      setUpdating(false); setUpdateProgress(0); setUpdateStage("");
    }
  }, [isOpen]);

  // ── WiFi actions ─────────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    setScanning(true); setNetworks([]); setSelectedSsid(null); setPassword(""); setConnectError(null);
    try {
      const res = await fetch("/api/wifi-manager", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "scan" }) });
      const data = await res.json();
      if (data.ok) setNetworks(data.networks ?? []);
      else showToast(data.error ?? "Ошибка сканирования", false);
    } catch { showToast("Ошибка сети", false); }
    finally { setScanning(false); setScanDone(true); }
  }, [showToast]);

  // ── Auto-scan when network tab opens (30s cooldown) ──────────────────────────
  useEffect(() => {
    if (tab !== "network" || scanning) return;
    const now = Date.now();
    if (now - lastScanRef.current < 30_000) return;
    lastScanRef.current = now;
    handleScan();
  }, [tab, handleScan, scanning]);

  // ── Refresh firmware + DB when firmware tab opens (5 min cooldown) ──────────
  useEffect(() => {
    if (tab !== "firmware") return;
    const now = Date.now();
    if (now - lastFirmwareCheckRef.current > 5 * 60_000) {
      lastFirmwareCheckRef.current = now;
      checkUpdate();
    }
    fetchSyncStatus();
  }, [tab, checkUpdate, fetchSyncStatus]);

  const handleConnectSaved = async (networkId: string, ssid: string) => {
    setConnectingTo(ssid); setConnectError(null); setNoInternet(false);
    try {
      const res = await fetch("/api/wifi-manager", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connectSaved", networkId }) });
      const data = await res.json();
      if (data.ok) {
        if (data.noInternet) setNoInternet(true);
        if (data.ssid) setStatus((p) => p ? { ...p, ...data } : p);
        else fetchStatus();
        setNetworks((p) => p.map((n) => ({ ...n, inUse: n.ssid === ssid })));
      } else {
        setConnectError(data.error ?? "Не удалось подключиться");
      }
    } catch { setConnectError("Ошибка сети"); }
    finally { setConnectingTo(null); }
  };

  const handleConnectNew = async (ssid: string, pwd: string) => {
    setConnectingTo(ssid); setConnectError(null); setNoInternet(false);
    try {
      const res = await fetch("/api/wifi-manager", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect", ssid, password: pwd }) });
      const data = await res.json();
      if (data.ok) {
        if (data.noInternet) setNoInternet(true);
        setSelectedSsid(null); setPassword("");
        setNetworks((p) => p.map((n) => ({ ...n, inUse: n.ssid === ssid })));
        fetchStatus();
      } else {
        setConnectError(data.error ?? "Не удалось подключиться");
      }
    } catch { setConnectError("Ошибка сети"); }
    finally { setConnectingTo(null); }
  };

  const handleUpdatePassword = async (networkId: string, ssid: string) => {
    if (!editPassword.trim()) return;
    setConnectingTo(ssid); setConnectError(null);
    try {
      const res = await fetch("/api/wifi-manager", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect", ssid, password: editPassword }) });
      const data = await res.json();
      if (data.ok) {
        setEditingId(null); setEditPassword("");
        fetchStatus();
        showToast("Пароль обновлён", true);
      } else {
        setConnectError(data.error ?? "Ошибка");
      }
    } catch { setConnectError("Ошибка сети"); }
    finally { setConnectingTo(null); }
  };

  const handleForget = async (networkId: string, ssid: string) => {
    setForgetting(networkId);
    try {
      const res = await fetch("/api/wifi-manager", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forget", networkId }) });
      const data = await res.json();
      if (data.ok) {
        setStatus((p) => p ? { ...p, savedNetworks: (p.savedNetworks ?? []).filter((n) => n.id !== networkId) } : p);
        setNetworks((p) => p.filter((n) => n.ssid !== ssid));
        showToast(`Сеть «${ssid}» удалена`, true);
      }
    } catch { showToast("Ошибка", false); }
    finally { setForgetting(null); }
  };

  // ── DB Sync ──────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true); setSyncProgress(5); setSyncResult(null);
    let p = 5;
    progressTimer.current = setInterval(() => { p = Math.min(p + Math.random() * 5 + 2, 85); setSyncProgress(p); }, 400);
    const startedAt = Date.now();
    try {
      const res = await fetch("/api/update-db", { method: "POST" });
      const data = await res.json();
      if (progressTimer.current) clearInterval(progressTimer.current);
      setSyncProgress(100);
      setTimeout(() => setSyncProgress(0), 700);
      if (!data.ok) {
        setSyncResult({ ...data, startedAt });
        setLogOpen(true);
      } else {
        await fetchSyncStatus();
        // Уведомляем page.tsx обновить данные (песни/стопки)
        window.dispatchEvent(new CustomEvent("db-sync-complete"));
      }
    } catch (e: any) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setSyncProgress(0); setSyncResult({ ok: false, error: String(e?.message ?? "Ошибка"), duration: 0, logs: [], startedAt });
      setLogOpen(true);
    } finally { setSyncing(false); }
  };

  // ── Firmware update ──────────────────────────────────────────────────────────
  const handleGitUpdate = async () => {
    if (updating) return;
    setUpdating(true); setUpdateDone(false); setUpdateProgress(5); setUpdateStage("Запуск"); setUpdateStartedAt(Date.now());
    try {
      await fetch("/api/git-update", { method: "POST" });
      let failures = 0;
      const poll = setInterval(async () => {
        try {
          const res = await fetch("/api/git-update");
          if (res.ok) {
            const data = await res.json();
            if (data.updateProgress) setUpdateProgress(data.updateProgress);
            if (data.updateStage) setUpdateStage(data.updateStage);
            if (data.processStatus === "done") {
              clearInterval(poll); setUpdateProgress(100); setUpdateStage("Готово");
              setUpdateDone(true); setUpdating(false);
              setTimeout(() => window.location.reload(), 1500);
            }
          }
          failures = 0;
        } catch {
          failures++;
          if (failures > 40) { clearInterval(poll); setUpdating(false); }
        }
      }, 5_000);
    } catch { setUpdating(false); showToast("Ошибка запуска обновления", false); }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const tempColor = (t: number) => t >= 80 ? "#f87171" : t >= 65 ? "#fbbf24" : "#4ade80";
  const cpuColor = (c: number) => c >= 80 ? "#f87171" : c >= 60 ? "#fbbf24" : "#4ade80";
  const signalPct = (dbm: number) => Math.max(0, Math.min(100, Math.round((dbm + 100) * 2)));
  const isOpen_ = (net: Network) => !net.security || net.security === "—" || net.security === "";
  const savedIds = new Set((status?.savedNetworks ?? []).map((n) => n.ssid));
  const knownNets = networks.filter((n) => savedIds.has(n.ssid));
  const otherNets = networks.filter((n) => !savedIds.has(n.ssid));
  const syncFresh = lastSyncedAt > Date.now() - 10 * 60_000;

  return (
    <Modal
      isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}
      placement="center" backdrop="blur" hideCloseButton scrollBehavior="normal"
      classNames={{ base: "max-w-[480px] w-[calc(100vw-16px)]" }}
    >
      <ModalContent style={{
        background: "rgba(244,241,237,0.92)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 32px 80px rgba(0,0,0,0.24)",
        borderRadius: 26,
        height: "min(700px, calc(100dvh - 32px))",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {() => (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 0", flexShrink: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: boardOffline
                  ? "radial-gradient(circle at 40% 40%, #94a3b8, #64748b)"
                  : "radial-gradient(circle at 40% 40%, #e8457a, #9e1239)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: boardOffline
                  ? "0 0 0 2px rgba(100,116,139,0.2), 0 3px 12px rgba(100,116,139,0.25)"
                  : "0 0 0 2px rgba(232,69,122,0.2), 0 3px 12px rgba(158,18,57,0.35)",
                transition: "background 0.4s ease, box-shadow 0.4s ease",
              }}>
                <svg width="19" height="19" viewBox="0 0 32 32" fill="rgba(255,255,255,0.95)" xmlns="http://www.w3.org/2000/svg">
                  <g><g>
                    <path d="M13.8,6.4c-1.4-1.1-2.9-1.9-4.6-2.5c1.5,0.9,3,1.7,4.2,2.9c-0.1,1.1-1.5,1.8-3.1,1.7c-0.1-0.1,0.1-0.1,0.1-0.3C10,8.1,9.5,8.2,9.2,8c0-0.1,0.2-0.1,0.1-0.2C9,7.6,8.6,7.5,8.3,7.3c0-0.1,0.2-0.1,0.3-0.2c-0.3-0.2-0.7-0.3-1-0.6c0.1-0.1,0.2,0,0.3-0.2C7.6,6.1,7.3,5.9,7.1,5.6c0.1-0.1,0.2,0,0.3-0.1C7.3,5.2,6.9,5,6.8,4.7c0.2,0,0.3,0.1,0.5-0.1C7.1,4.3,6.7,4.2,6.6,3.8c0.1-0.1,0.3,0,0.4-0.1c0-0.3-0.2-0.5-0.3-0.8c0.3-0.1,0.7,0,1-0.1c0-0.1-0.1-0.2-0.1-0.3c0.4-0.2,0.8,0,1.2,0.1c0.1-0.2-0.1-0.2,0-0.4c0.3,0,0.6,0.2,1,0.2C9.9,2.2,9.6,2.2,9.6,2c0.4,0,0.7,0.2,1,0.4c0.1-0.1,0-0.2,0.1-0.4c0.3,0.1,0.5,0.3,0.8,0.5c0.2,0,0.1-0.2,0.2-0.3c0.3,0.1,0.5,0.4,0.7,0.5c0.2,0,0.1-0.2,0.2-0.3c0.3,0.2,0.5,0.5,0.7,0.7c0.2,0,0.1-0.2,0.3-0.2c0.6,0.7,1.2,1.5,1.1,2.5C14.7,5.9,14.3,6.2,13.8,6.4L13.8,6.4z"/>
                    <path d="M23.5,7.1c0.1,0.1,0.2,0.1,0.3,0.1c-0.3,0.3-0.7,0.3-1.1,0.5c0,0.1,0.1,0.1,0.1,0.2c-0.3,0.2-0.8,0.1-1.1,0.2c-0.1,0.1,0.1,0.2,0,0.3c-0.4,0.1-0.8,0-1.3-0.1c-0.9-0.2-1.6-0.6-1.9-1.5c1.2-1.3,2.7-2.1,4.2-2.9c-1.7,0.6-3.2,1.4-4.6,2.4c-0.6-0.2-0.9-0.7-0.9-1.3c0-0.7,0.6-1.8,1.2-2.3l0.2,0.3c0.3-0.2,0.5-0.6,0.8-0.7c0.1,0.1,0,0.3,0.2,0.3c0.2-0.1,0.4-0.4,0.7-0.5c0.1,0.1,0,0.2,0.2,0.3C20.8,2.4,21,2.1,21.4,2c0,0.1-0.1,0.2,0,0.4C21.7,2.2,22,2,22.4,2c0,0.1-0.2,0.2-0.1,0.4c0.3,0,0.6-0.2,1-0.2c0,0.1-0.1,0.2,0,0.4c0.4-0.1,0.8-0.2,1.2-0.1c0,0.1-0.1,0.2-0.1,0.3c0.3,0.1,0.7,0,1,0.1C25.3,3.2,25,3.4,25,3.7c0.1,0.1,0.3,0,0.4,0.1c-0.1,0.4-0.5,0.5-0.6,0.8c0.1,0.2,0.3,0,0.4,0.1c-0.1,0.3-0.5,0.5-0.7,0.8c0.1,0.2,0.2,0.1,0.3,0.1c-0.2,0.3-0.5,0.4-0.7,0.7c0.1,0.1,0.2,0.1,0.3,0.2C24.2,6.8,23.8,6.9,23.5,7.1L23.5,7.1z"/>
                  </g><g>
                    <path d="M15.4,16c0,1.8-1.4,3.6-3.2,4c-1.8,0.4-3.4-0.9-3.5-2.7c-0.1-1.8,1.2-3.6,2.9-4C13.7,12.7,15.4,14,15.4,16z"/>
                    <path d="M23.4,16.9c0,2.1-1.8,3.4-3.8,2.8c-1.8-0.6-3.1-2.5-2.8-4.4c0.3-1.8,2.1-2.9,3.9-2.2C22.3,13.7,23.4,15.3,23.4,16.9L23.4,16.9z"/>
                    <path d="M16.1,19.4c1,0,2,0.4,2.7,1.2c1.2,1.3,1.1,3.2-0.2,4.3c-1.3,1.1-3.4,1.2-4.7,0.1c-1-0.8-1.4-1.8-1.2-3.1c0.3-1.3,1.2-2,2.4-2.4C15.4,19.5,15.7,19.4,16.1,19.4L16.1,19.4z"/>
                    <path d="M19.8,25.3c0.1-1,0.5-2,1.3-2.9c0.5-0.5,1-1,1.5-1.4c0.3-0.2,0.6-0.3,0.9-0.4c0.6-0.1,1.1,0.1,1.3,0.7c0.4,1,0.5,2,0,3c-0.6,1.4-1.7,2.3-3.2,2.6c-0.1,0-0.3,0-0.5,0C20.2,27,19.8,26.6,19.8,25.3z"/>
                    <path d="M6.9,22.7c0,0,0-0.2,0-0.3c0.1-1.1,0.7-1.5,1.8-1.2c1.7,0.5,3.3,2.5,3.4,4.3c0,1.1-0.5,1.6-1.6,1.4c-1.5-0.2-2.5-1-3.1-2.3C7,24,6.9,23.4,6.9,22.7L6.9,22.7z"/>
                    <path d="M16.2,12.8c-0.8,0-1.6-0.1-2.3-0.5c-1.3-0.7-1.3-1.6-0.2-2.4c1.5-1.1,3.5-1,4.9,0.2c0.1,0.1,0.2,0.2,0.3,0.3c0.5,0.6,0.4,1.2-0.2,1.7c-0.5,0.4-1.1,0.5-1.7,0.6C16.7,12.8,16.4,12.8,16.2,12.8L16.2,12.8z"/>
                    <path d="M16,30c-1.2,0-2.2-0.5-3.1-1.4c-0.4-0.4-0.4-0.8,0.1-1.1c0.7-0.4,1.4-0.6,2.2-0.7c1-0.1,2-0.1,3,0.2c0.2,0.1,0.5,0.2,0.7,0.3c0.6,0.3,0.7,0.6,0.2,1.2c0,0,0,0-0.1,0.1C18.3,29.5,17.3,30,16,30z"/>
                    <path d="M7.8,16.8c0,1.1-0.2,2.1-0.6,3.1c-0.1,0.3-0.2,0.5-0.4,0.7C6.5,21,6.3,21,6,20.7c-1.4-1.4-1.2-4.1,0.5-5.3c0.6-0.5,1-0.4,1.2,0.4C7.7,16.1,7.8,16.5,7.8,16.8L7.8,16.8z"/>
                    <path d="M26.9,18.3c0,0.8-0.3,1.7-0.9,2.4c-0.3,0.3-0.5,0.3-0.8,0c-0.3-0.4-0.5-0.9-0.6-1.4c-0.3-1-0.4-2.1-0.3-3.2c0-0.2,0.1-0.5,0.2-0.7c0.2-0.4,0.4-0.5,0.8-0.2C26.3,15.8,26.9,16.9,26.9,18.3z"/>
                    <path d="M7.5,13.9c-0.1-1.3,0.3-2.5,1.4-3.3c1.1-0.8,2.3-1,3.6-0.8c0,0.3-0.2,0.5-0.3,0.7c-0.7,0.9-1.6,1.6-2.4,2.3c-0.5,0.4-1,0.7-1.5,1C7.9,13.9,7.7,14.1,7.5,13.9z"/>
                    <path d="M24.6,14c-0.2,0.1-0.5,0-0.7-0.2c-0.7-0.4-1.4-0.9-2-1.4c-0.7-0.6-1.3-1.2-1.9-1.8c-0.1-0.2-0.3-0.4-0.3-0.6c0.6-0.3,2.6-0.2,3.6,0.7C24.3,11.5,24.9,13.1,24.6,14z"/>
                  </g></g>
                </svg>
              </div>
              <span className="input-header" style={{ fontSize: 16, fontWeight: 700, color: "#2d2015", flex: 1 }}>
                Управление платой
              </span>
              <button onClick={onClose} style={{
                width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.07)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* ── Tabs ────────────────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 4, padding: "10px 16px 0", flexShrink: 0 }}>
              {(["system", "power", "network", "firmware"] as Tab[]).map((t) => {
                const labels: Record<Tab, string> = { system: "Система", power: "Питание", network: "Сеть", firmware: "Прошивка" };
                const active = tab === t;
                const disabled = boardOffline && t !== "system" && t !== "power";
                return (
                  <button key={t} onClick={() => !disabled && setTab(t)} className="input-header" style={{
                    flex: 1, padding: "7px 2px", borderRadius: 10, border: "none",
                    background: active ? "rgba(125,94,66,0.14)" : "transparent",
                    color: disabled ? "rgba(0,0,0,0.18)" : active ? "#7D5E42" : "rgba(0,0,0,0.38)",
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                  }}>
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            {/* ── Divider ──────────────────────────────────────────────────────── */}
            <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "8px 16px 0", flexShrink: 0 }} />

            {/* ── Content ─────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflow: "hidden", padding: "12px 16px 36px", display: "flex", flexDirection: "column", gap: 10 }}>

              {/* ══ СИСТЕМА ═════════════════════════════════════════════════════ */}
              {tab === "system" && (
                <>
                  {/* Оверлей «Плата выключена» */}
                  {boardOffline && (
                    <div style={{
                      ...card, alignItems: "center", justifyContent: "center",
                      padding: "28px 16px", gap: 10, opacity: 0.7,
                    }}>
                      <span style={{ fontSize: 32 }}>📴</span>
                      <span className="input-header" style={{ fontSize: 14, fontWeight: 600, color: "rgba(0,0,0,0.4)" }}>
                        Плата выключена
                      </span>
                    </div>
                  )}
                  {/* CPU / Temp / RAM card */}
                  {!boardOffline && <div style={card}>
                    <SectionLabel>Плата</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tempColor(sysData?.temp ?? 0)} strokeWidth="2" strokeLinecap="round">
                            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                          </svg>
                        </div>
                        <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", width: 80 }}>Температура</span>
                        <ProgressBar value={sysData?.temp ?? 0} max={90} color={tempColor(sysData?.temp ?? 0)} />
                        <span className="input-header" style={{ fontSize: 13, fontWeight: 700, color: tempColor(sysData?.temp ?? 0), width: 50, textAlign: "right" }}>
                          {sysData ? `${sysData.temp}°C` : "—"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={cpuColor(sysData?.cpuPercent ?? 0)} strokeWidth="2" strokeLinecap="round">
                            <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
                            <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
                            <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
                            <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
                            <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
                          </svg>
                        </div>
                        <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", width: 80 }}>CPU</span>
                        <ProgressBar value={sysData?.cpuPercent ?? 0} max={100} color={cpuColor(sysData?.cpuPercent ?? 0)} />
                        <span className="input-header" style={{ fontSize: 13, fontWeight: 700, color: cpuColor(sysData?.cpuPercent ?? 0), width: 50, textAlign: "right" }}>
                          {sysData ? `${sysData.cpuPercent}%` : "—"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#BD9673" strokeWidth="2" strokeLinecap="round">
                            <rect x="2" y="6" width="20" height="12" rx="2"/>
                            <line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/>
                            <line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="10" x2="18" y2="14"/>
                          </svg>
                        </div>
                        <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", width: 80 }}>ОЗУ</span>
                        <ProgressBar value={sysData?.ramUsed ?? 0} max={sysData?.ramTotal ?? 4096} color="#BD9673" />
                        <span className="input-header" style={{ fontSize: 13, fontWeight: 600, color: "#7D5E42", width: 50, textAlign: "right" }}>
                          {sysData ? `${sysData.ramUsed}МБ` : "—"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                        </div>
                        <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", width: 80 }}>Работает</span>
                        <span className="input-header" style={{ fontSize: 13, fontWeight: 600, color: "#2d2015" }}>
                          {sysData?.uptime ?? "—"}
                        </span>
                      </div>

                      {sysData?.throttled && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)" }}>
                          <span style={{ fontSize: 14 }}>⚠️</span>
                          <span className="input-header" style={{ fontSize: 12, color: "#dc2626" }}>Тротлинг — плата перегрелась</span>
                        </div>
                      )}
                    </div>
                  </div>}

                  {/* Fan card */}
                  {!boardOffline && <div style={{ ...card, flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <FanIcon rpm={sysData?.fanRpm ?? 0} />
                    <div style={{ flex: 1 }}>
                      <div className="input-header" style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginBottom: 2 }}>Вентилятор</div>
                      <div className="input-header" style={{ fontSize: 20, fontWeight: 700, color: "#2d2015" }}>
                        {sysData ? (sysData.fanRpm > 0 ? `${sysData.fanRpm.toLocaleString()} RPM` : "Выкл") : "—"}
                      </div>
                    </div>
                    <div style={{
                      padding: "4px 10px", borderRadius: 8,
                      background: (sysData?.fanRpm ?? 0) > 0 ? "rgba(74,222,128,0.12)" : "rgba(0,0,0,0.06)",
                    }}>
                      <span className="input-header" style={{
                        fontSize: 11, fontWeight: 600,
                        color: (sysData?.fanRpm ?? 0) > 0 ? "#166534" : "rgba(0,0,0,0.35)",
                      }}>
                        {(sysData?.fanRpm ?? 0) > 3500 ? "Быстро" : (sysData?.fanRpm ?? 0) > 1500 ? "Средне" : (sysData?.fanRpm ?? 0) > 0 ? "Медленно" : "Стоп"}
                      </span>
                    </div>
                  </div>}

                  {/* Network status card */}
                  {!boardOffline && <div style={card}>
                    <SectionLabel>Сеть</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <NetRow label="Точка доступа" value={
                        status?.apActive
                          ? `${status.apDevices ?? 0} ${plural(status.apDevices ?? 0, "устройство", "устройства", "устройств")}`
                          : "Выкл"
                      } dot={status?.apActive ? "green" : "gray"} />
                      <div style={{ height: 1, background: "rgba(0,0,0,0.05)" }} />
                      <NetRow label="Wi-Fi (wlan1)" value={status?.ssid ?? "—"} dot={status?.connected ? "green" : "gray"} />
                      {status?.ip && <NetRow label="IP адрес" value={status.ip} mono />}
                      <NetRow
                        label="Сигнал"
                        value={sysData ? `${sysData.wlan1Signal} дБм` : "—"}
                        extra={<SignalBars signal={signalPct(sysData?.wlan1Signal ?? -100)} size={13} />}
                      />
                      {(sysData?.wlan1LinkMbps ?? 0) > 0 && (
                        <NetRow label="Скорость Wi-Fi" value={`${sysData!.wlan1LinkMbps} Мбит/с`} />
                      )}
                      <div style={{ height: 1, background: "rgba(0,0,0,0.05)" }} />
                      {/* Internet throughput */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>Интернет</span>
                        <span className="input-header" style={{ fontSize: 12, fontWeight: 600, color: "#2d2015" }}>
                          ↓ {fmtBps(sysData?.wlan1RxBps ?? 0)} &nbsp;·&nbsp; ↑ {fmtBps(sysData?.wlan1TxBps ?? 0)}
                        </span>
                      </div>
                      {/* Tablet throughput */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>Планшеты</span>
                        <span className="input-header" style={{ fontSize: 12, fontWeight: 600, color: "#2d2015" }}>
                          ↓ {fmtBps(sysData?.wlan0TxBps ?? 0)} &nbsp;·&nbsp; ↑ {fmtBps(sysData?.wlan0RxBps ?? 0)}
                        </span>
                      </div>
                      {/* Sync freshness */}
                      {lastSyncedAt > 0 && (
                        <>
                          <div style={{ height: 1, background: "rgba(0,0,0,0.05)" }} />
                          <NetRow
                            label="Данные синхр."
                            value={fmtAgo(lastSyncedAt)}
                            dot={syncFresh ? "green" : "gray"}
                          />
                        </>
                      )}
                      {noInternet && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)" }}>
                          <span style={{ fontSize: 14 }}>⚠️</span>
                          <span className="input-header" style={{ fontSize: 12, color: "#92400e" }}>Нет интернета в этой сети</span>
                        </div>
                      )}
                    </div>
                  </div>}
                </>
              )}

              {/* ══ СЕТЬ ═════════════════════════════════════════════════════════ */}
              {tab === "network" && (
                <>
                  {/* Current connection */}
                  <div style={card}>
                    <SectionLabel>Текущее подключение</SectionLabel>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: status?.connected ? "#4ade80" : "#94a3b8",
                        boxShadow: status?.connected ? "0 0 0 2.5px rgba(74,222,128,0.25)" : "none",
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="input-header" style={{ fontSize: 15, fontWeight: 700, color: "#2d2015", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {status?.ssid ?? "—"}
                        </div>
                        <div className="input-header" style={{ fontSize: 12, color: "rgba(0,0,0,0.38)", marginTop: 1, fontFamily: "monospace" }}>
                          {status?.ip ?? ""}
                        </div>
                      </div>
                      {noInternet && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 7, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)" }}>
                          <span style={{ fontSize: 11 }}>⚠️</span>
                          <span className="input-header" style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>Нет инт.</span>
                        </div>
                      )}
                      {sysData && <SignalBars signal={signalPct(sysData.wlan1Signal)} />}
                    </div>
                  </div>

                  {/* AP status */}
                  <div style={card}>
                    <SectionLabel>Точка доступа</SectionLabel>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: status?.apActive ? "#4ade80" : "#94a3b8",
                          boxShadow: status?.apActive ? "0 0 0 2.5px rgba(74,222,128,0.25)" : "none",
                        }} />
                        <span className="input-header" style={{ fontSize: 14, fontWeight: 600, color: "#2d2015" }}>
                          RaspberryPi-AP
                        </span>
                      </div>
                      <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.4)" }}>
                        {status?.apActive
                          ? `${status.apDevices ?? 0} ${plural(status.apDevices ?? 0, "устройство", "устройства", "устройств")}`
                          : "Выкл"}
                      </span>
                    </div>
                  </div>

                  {/* Scan section header + refresh button */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 2px 0" }}>
                    <span className="input-header" style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Доступные сети
                    </span>
                    <button
                      onClick={() => { lastScanRef.current = 0; handleScan(); }}
                      disabled={scanning}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(125,94,66,0.2)",
                        background: "rgba(125,94,66,0.07)", cursor: scanning ? "not-allowed" : "pointer",
                        opacity: scanning ? 0.5 : 1,
                      }}
                    >
                      <svg
                        width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke="#7D5E42" strokeWidth="2.5" strokeLinecap="round"
                        className={scanning ? "animate-spin" : ""}
                      >
                        <polyline points="23 4 23 10 17 10"/>
                        <polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                      </svg>
                      <span className="input-header" style={{ fontSize: 11, fontWeight: 600, color: "#7D5E42" }}>
                        {scanning ? "Поиск..." : "Обновить"}
                      </span>
                    </button>
                  </div>

                  {/* Scanning indicator */}
                  {scanning && (
                    <div style={{ ...card, flexDirection: "row", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7D5E42" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.4)" }}>Сканирую сети...</span>
                    </div>
                  )}

                  {/* Scan results */}
                  {!scanning && networks.length > 0 && (
                    <>
                      {/* Known networks (from scan, saved in wpa_supplicant) */}
                      {knownNets.length > 0 && (
                        <div style={card}>
                          <SectionLabel>Знакомые сети</SectionLabel>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {knownNets.map((net) => {
                              const sn = status?.savedNetworks?.find((n) => n.ssid === net.ssid);
                              if (!sn) return null;
                              const inUse = net.ssid === status?.ssid;
                              const isEditing = editingId === sn.id;
                              const isConnecting = connectingTo === net.ssid;
                              return (
                                <div key={sn.id} style={{ display: "flex", flexDirection: "column" }}>
                                  <div style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    padding: "9px 12px", borderRadius: isEditing ? "10px 10px 0 0" : 10,
                                    background: inUse ? "rgba(125,94,66,0.1)" : "rgba(255,255,255,0.5)",
                                    border: inUse ? "1.5px solid rgba(125,94,66,0.3)" : "1px solid rgba(255,255,255,0.7)",
                                    borderBottom: isEditing ? "none" : undefined,
                                  }}>
                                    <SignalBars signal={net.signal} size={13} />
                                    <div style={{
                                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                                      background: inUse ? "#4ade80" : "rgba(0,0,0,0.15)",
                                      boxShadow: inUse ? "0 0 0 2px rgba(74,222,128,0.25)" : "none",
                                    }} />
                                    <span className="input-header" style={{ flex: 1, fontSize: 14, fontWeight: inUse ? 700 : 500, color: inUse ? "#7D5E42" : "#2d2015" }}>
                                      {sn.ssid}
                                    </span>
                                    {inUse && (
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    )}
                                    {!inUse && !isConnecting && (
                                      <button onClick={() => handleConnectSaved(sn.id, sn.ssid)} className="input-header" style={smallBtn}>
                                        Подключить
                                      </button>
                                    )}
                                    {isConnecting && (
                                      <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7D5E42" strokeWidth="2.5">
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                      </svg>
                                    )}
                                    <button
                                      onClick={() => { setEditingId(isEditing ? null : sn.id); setEditPassword(""); setConnectError(null); }}
                                      style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "rgba(0,0,0,0.3)", display: "flex" }}
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="3"/>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleForget(sn.id, sn.ssid)}
                                      disabled={forgetting === sn.id}
                                      style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "rgba(248,113,113,0.6)", display: "flex" }}
                                    >
                                      {forgetting === sn.id ? (
                                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                                        </svg>
                                      ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                                        </svg>
                                      )}
                                    </button>
                                  </div>

                                  {isEditing && (
                                    <div data-expand-panel style={{
                                      background: "rgba(189,150,115,0.06)", borderRadius: "0 0 10px 10px",
                                      border: "1.5px solid rgba(125,94,66,0.2)", borderTop: "none",
                                      padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8,
                                    }}>
                                      <span className="input-header" style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>Новый пароль</span>
                                      <PasswordInput value={editPassword} onChange={(v) => { setEditPassword(v); setConnectError(null); }}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleUpdatePassword(sn.id, sn.ssid); }}
                                        error={connectError} />
                                      <button onClick={() => handleUpdatePassword(sn.id, sn.ssid)} disabled={!editPassword.trim()} className="input-header" style={{
                                        padding: "8px 0", borderRadius: 8, border: "none",
                                        background: "linear-gradient(135deg,#BD9673,#7D5E42)", color: "white",
                                        fontSize: 13, fontWeight: 700, cursor: editPassword.trim() ? "pointer" : "not-allowed",
                                        opacity: editPassword.trim() ? 1 : 0.5,
                                      }}>
                                        Сохранить и подключиться
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Unknown networks */}
                      {otherNets.length > 0 && (
                        <div style={card}>
                          <SectionLabel>Другие сети</SectionLabel>
                          {otherNets.map((net) => (
                            <ScanNetItem
                              key={net.ssid} net={net} status={status}
                              connectingTo={connectingTo} selectedSsid={selectedSsid}
                              password={password} connectError={connectError}
                              setSelectedSsid={setSelectedSsid} setPassword={setPassword}
                              setConnectError={setConnectError}
                              handleConnectNew={handleConnectNew} isOpen_={isOpen_}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Empty state after scan */}
                  {!scanning && scanDone && networks.length === 0 && (
                    <div style={{ ...card, alignItems: "center", padding: "20px 16px" }}>
                      <p className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.35)", margin: 0 }}>
                        Сети не найдены
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ══ ПИТАНИЕ ═════════════════════════════════════════════════════ */}
              {tab === "power" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <ShutdownButton onOffline={handleBoardOffline} offline={boardOffline} />

                  {boardOffline && (
                    <div style={{ ...card, alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 28 }}>📴</span>
                      <span className="input-header" style={{ fontSize: 14, fontWeight: 600, color: "rgba(0,0,0,0.4)" }}>Плата выключена</span>
                    </div>
                  )}

                  {!boardOffline && (() => {
                    const voltOk = (v: number) => v >= 0.9 && v <= 1.25;
                    const voltColor = (v: number | undefined) => !v ? "rgba(0,0,0,0.2)" : voltOk(v) ? "#4ade80" : "#f87171";
                    const voltTextColor = (v: number | undefined) => !v ? "rgba(0,0,0,0.3)" : voltOk(v) ? "#4ade80" : "#f87171";
                    const flags = sysData?.throttleFlags ?? 0;
                    const undervoltagNow = !!(flags & 0x1);
                    const thermalNow = !!(flags & 0xC);
                    const undervoltageEver = !!(flags & 0x10000);
                    const thermalEver = !!(flags & 0xC0000);
                    return (
                      <>
                        {/* Напряжения */}
                        <div style={{ ...card }}>
                          <SectionLabel>Напряжение</SectionLabel>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                                  stroke={voltColor(sysData?.voltageCore)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="13 2 13 9 19 9 11 22 11 15 5 15 13 2"/>
                                </svg>
                              </div>
                              <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", width: 80 }}>Ядро CPU</span>
                              <ProgressBar value={sysData?.voltageCore ?? 0} max={1.4} color={voltColor(sysData?.voltageCore)} />
                              <span className="input-header" style={{ fontSize: 13, fontWeight: 700, width: 54, textAlign: "right", whiteSpace: "nowrap", color: voltTextColor(sysData?.voltageCore) }}>
                                {sysData?.voltageCore ? `${sysData.voltageCore.toFixed(3)}V` : "—"}
                              </span>
                            </div>

                            {(sysData?.voltageSdram ?? 0) > 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                                    stroke={voltColor(sysData?.voltageSdram)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="6" width="20" height="12" rx="2"/>
                                    <line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/>
                                    <line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="10" x2="18" y2="14"/>
                                  </svg>
                                </div>
                                <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", width: 80 }}>SDRAM</span>
                                <ProgressBar value={sysData?.voltageSdram ?? 0} max={1.4} color={voltColor(sysData?.voltageSdram)} />
                                <span className="input-header" style={{ fontSize: 13, fontWeight: 600, width: 54, textAlign: "right", whiteSpace: "nowrap", color: voltTextColor(sysData?.voltageSdram) }}>
                                  {sysData?.voltageSdram ? `${sysData.voltageSdram.toFixed(3)}V` : "—"}
                                </span>
                              </div>
                            )}

                            {(undervoltagNow || undervoltageEver) && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)" }}>
                                <span style={{ fontSize: 14 }}>⚡</span>
                                <span className="input-header" style={{ fontSize: 12, color: "#dc2626" }}>
                                  {undervoltagNow ? "Пониженное напряжение — плохой блок питания" : "Было пониженное напряжение"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Процессор */}
                        <div style={{ ...card }}>
                          <SectionLabel>Процессор</SectionLabel>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#BD9673" strokeWidth="2" strokeLinecap="round">
                                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                                </svg>
                              </div>
                              <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", width: 80 }}>Частота</span>
                              <ProgressBar value={sysData?.clockArmMhz ?? 0} max={2400} color="#BD9673" />
                              <span className="input-header" style={{ fontSize: 13, fontWeight: 600, color: "#7D5E42", width: 54, textAlign: "right", whiteSpace: "nowrap" }}>
                                {sysData?.clockArmMhz ? `${sysData.clockArmMhz} МГц` : "—"}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round">
                                  <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                                </svg>
                              </div>
                              <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", width: 80 }}>Режим</span>
                              <span className="input-header" style={{ fontSize: 13, fontWeight: 600, color: "#2d2015" }}>
                                {sysData?.cpuGovernor ?? "—"}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" strokeLinecap="round">
                                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                              </div>
                              <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", width: 80 }}>Работает</span>
                              <span className="input-header" style={{ fontSize: 13, fontWeight: 600, color: "#2d2015" }}>
                                {sysData?.uptime ?? "—"}
                              </span>
                            </div>

                            {(thermalNow || thermalEver) && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)" }}>
                                <span style={{ fontSize: 14 }}>🌡️</span>
                                <span className="input-header" style={{ fontSize: 12, color: "#dc2626" }}>
                                  {thermalNow ? "Тепловой тротлинг" : "Был тепловой тротлинг"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ══ ПРОШИВКА ════════════════════════════════════════════════════ */}
              {tab === "firmware" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", minHeight: 0 }}>
                  {/* Git update */}
                  <div style={{ ...card, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <SectionLabel style={{ margin: 0 }}>Прошивка</SectionLabel>
                      <button onClick={checkUpdate} disabled={checking || updating} style={{ background: "none", border: "none", cursor: checking ? "not-allowed" : "pointer", padding: 3, color: "rgba(0,0,0,0.3)", display: "flex" }}>
                        {checking ? (
                          <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                          </svg>
                        )}
                      </button>
                    </div>

                    {checking && <div className="input-header" style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginBottom: 10 }}>Проверка обновления...</div>}
                    {!checking && updateInfo && (
                      <div style={{ marginBottom: 10 }}>
                        {updateInfo.error ? (
                          <div className="input-header" style={{ fontSize: 12, color: "#dc2626" }}>{updateInfo.error}</div>
                        ) : updateInfo.hasUpdate ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 0 2px rgba(245,158,11,0.25)", flexShrink: 0 }} />
                              <span className="input-header" style={{ fontSize: 12, color: "#92400e", flex: 1 }}>
                                Доступна новая прошивка · {fmtDate(updateInfo.remote?.date ?? "")}
                              </span>
                              <button onClick={() => setCommitOpen((v) => !v)} className="input-header" style={{ fontSize: 12, color: "#7D5E42", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                {commitOpen ? "Скрыть" : "Подробнее"}
                              </button>
                            </div>
                            {commitOpen && updateInfo.remote && (
                              <div style={{ background: "rgba(22,14,6,0.87)", borderRadius: 8, padding: "8px 10px", marginTop: 2 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{updateInfo.remote.sha}</span>
                                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{fmtDate(updateInfo.remote.date)}</span>
                                </div>
                                <div style={{ fontFamily: "monospace", fontSize: 11, color: "#a3e635", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                  {updateInfo.remote.message}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : updateInfo.processStatus === "running" || updateInfo.processStatus === "restarting" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7D5E42" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                            <span className="input-header" style={{ fontSize: 12, color: "#7D5E42" }}>Обновление в процессе...</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {(updateDone || updateInfo.processStatus === "done") ? (
                                <>
                                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 2px rgba(74,222,128,0.22)", flexShrink: 0 }} />
                                  <span className="input-header" style={{ fontSize: 12, color: "#166534", fontWeight: 600, flex: 1 }}>Актуальная прошивка</span>
                                </>
                              ) : (
                                <>
                                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(0,0,0,0.18)", flexShrink: 0 }} />
                                  <span className="input-header" style={{ fontSize: 12, color: "rgba(0,0,0,0.38)", flex: 1 }}>
                                    {updateInfo.remote?.date ? `Обновлено ${fmtDate(updateInfo.remote.date)}` : "Прошивка актуальна"}
                                  </span>
                                </>
                              )}
                              {updateInfo.localSha && (
                                <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(0,0,0,0.25)" }}>{updateInfo.localSha}</span>
                              )}
                              {(updateInfo.recentCommits?.length ?? 0) > 0 && (
                                <button onClick={() => setFirmwareLogOpen(v => !v)} className="input-header" style={{ fontSize: 12, color: "#7D5E42", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                  {firmwareLogOpen ? "Скрыть" : "Подробнее"}
                                </button>
                              )}
                            </div>
                            {firmwareLogOpen && updateInfo.recentCommits && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2, maxHeight: 260, overflowY: "auto" }}>
                                {updateInfo.recentCommits.slice(0, 10).map((c, i) => (
                                  <div key={i} style={{
                                    display: "flex", alignItems: "flex-start", gap: 8,
                                    padding: "6px 10px", borderRadius: 8,
                                    background: i === 0 ? "rgba(74,222,128,0.08)" : "rgba(0,0,0,0.03)",
                                    border: i === 0 ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(0,0,0,0.05)",
                                  }}>
                                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(0,0,0,0.3)", flexShrink: 0, marginTop: 1 }}>{c.sha}</span>
                                    <span className="input-header" style={{ fontSize: 12, color: "#2d2015", flex: 1, lineHeight: 1.4 }}>{c.message}</span>
                                    <span className="input-header" style={{ fontSize: 10, color: "rgba(0,0,0,0.3)", flexShrink: 0, whiteSpace: "nowrap" }}>{fmtDate(c.date)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {updating && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="input-header" style={{ fontSize: 12, color: "#7D5E42", fontWeight: 600 }}>{updateStage}</span>
                            <button
                              onClick={() => { setUpdating(false); setUpdateProgress(0); setUpdateStage(""); }}
                              className="input-header"
                              style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              Отменить
                            </button>
                          </div>
                          <span className="input-header" style={{ fontSize: 12, color: "#7D5E42", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                            {updateProgress > 5 && updateStartedAt > 0 && (() => {
                              const elapsed = (Date.now() - updateStartedAt) / 1000;
                              const rate = updateProgress / elapsed;
                              const remaining = rate > 0 ? Math.round((100 - updateProgress) / rate) : 0;
                              if (remaining <= 0) return null;
                              const m = Math.floor(remaining / 60);
                              const s = remaining % 60;
                              return <span style={{ fontWeight: 400, color: "rgba(0,0,0,0.4)", fontSize: 11 }}>
                                ~{m > 0 ? `${m}м ` : ""}{s}с
                              </span>;
                            })()}
                            {updateProgress}%
                          </span>
                        </div>
                        <div style={{ height: 5, background: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${updateProgress}%`, borderRadius: 3,
                            background: "linear-gradient(90deg,#BD9673,#7D5E42)",
                            transition: "width 0.8s ease",
                          }} />
                        </div>
                      </div>
                    )}

                    <button onClick={handleGitUpdate} disabled={updating || !updateInfo?.hasUpdate} className="input-header" style={{
                      width: "100%", padding: "11px 0", borderRadius: 11, border: "none",
                      background: updating ? "rgba(125,94,66,0.12)" : updateDone ? "linear-gradient(135deg,#BD9673,#7D5E42)" : updateInfo?.hasUpdate ? "linear-gradient(135deg,#BD9673,#7D5E42)" : "rgba(0,0,0,0.07)",
                      color: updating ? "#7D5E42" : updateDone ? "white" : updateInfo?.hasUpdate ? "white" : "rgba(0,0,0,0.3)",
                      fontSize: 14, fontWeight: 700, cursor: (updating || !updateInfo?.hasUpdate) ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s",
                      boxShadow: (updateInfo?.hasUpdate || updateDone) && !updating ? "0 4px 14px rgba(125,94,66,0.3)" : "none",
                    }}>
                      {updating && <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
                      {updating ? "Обновляю прошивку..." : updateDone ? "Готово! Перезагружаю..." : "Обновить прошивку"}
                    </button>
                  </div>

                  {/* DB Sync */}
                  <div style={{ ...card, flex: 1, overflow: "hidden", minHeight: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <SectionLabel style={{ margin: 0 }}>База данных</SectionLabel>
                    </div>

                    {/* DB status */}
                    {lastSyncedAt > 0 && !syncing && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                          background: syncFresh ? "#4ade80" : lastSyncedAt > Date.now() - 60 * 60_000 ? "#fbbf24" : "#f87171",
                          boxShadow: syncFresh ? "0 0 0 2px rgba(74,222,128,0.22)" : "none",
                        }} />
                        <span className="input-header" style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", flex: 1 }}>
                          Синхронизировано {fmtAgo(lastSyncedAt)}
                        </span>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleSync} disabled={syncing} className="input-header" style={{
                        flex: 1, padding: "11px 0", borderRadius: 11, border: "none",
                        background: syncing ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.7)",
                        color: "#7D5E42", fontSize: 14, fontWeight: 700,
                        cursor: syncing ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      }}>
                        {syncing ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>}
                        {syncing ? "Синхронизирую..." : "Синхронизировать вручную"}
                      </button>
                    </div>

                    {syncing && syncProgress > 0 && (
                      <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
                        <div style={{ height: "100%", width: `${syncProgress}%`, background: "linear-gradient(90deg,#BD9673,#7D5E42)", transition: "width 0.4s ease" }} />
                      </div>
                    )}

                    {/* История изменений */}
                    <div style={{ marginTop: 8, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
                      <button onClick={() => setHistoryOpen((v) => !v)} style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "none", border: "none", cursor: "pointer", padding: "4px 0", flexShrink: 0,
                      }}>
                        <span className="input-header" style={{ fontSize: 12, fontWeight: 700, color: "rgba(0,0,0,0.45)" }}>
                          Журнал изменений
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {syncHistory.length > 0 && (
                            <span className="input-header" style={{ fontSize: 10, color: "rgba(0,0,0,0.3)" }}>{Math.min(syncHistory.length, 10)} записей</span>
                          )}
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" strokeLinecap="round"
                            style={{ transform: historyOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                      </button>

                      {historyOpen && (
                        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1, overflowY: "auto", minHeight: 0 }}>
                          {syncHistory.length === 0 && (
                            <div style={{ padding: "14px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span className="input-header" style={{ fontSize: 12, color: "rgba(0,0,0,0.3)" }}>Синхронизаций ещё не было</span>
                            </div>
                          )}
                            {syncHistory.slice(0, 10).map((entry, i) => {
                              const allChanges = [
                                ...entry.added.map(c => ({ ...c, action: "added" as const })),
                                ...entry.updated.map(c => ({ ...c, action: "updated" as const })),
                                ...entry.deleted.map(c => ({ ...c, action: "deleted" as const })),
                              ];
                              const total = allChanges.length;
                              return (
                                <div key={i} style={{
                                  borderRadius: 12, overflow: "hidden", flexShrink: 0,
                                  border: i === 0 ? "1px solid rgba(125,94,66,0.2)" : "1px solid rgba(0,0,0,0.07)",
                                  background: i === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)",
                                  boxShadow: i === 0 ? "0 1px 6px rgba(125,94,66,0.08)" : "none",
                                }}>
                                  {/* Заголовок записи */}
                                  <div style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "7px 12px",
                                    background: i === 0 ? "rgba(125,94,66,0.07)" : "rgba(0,0,0,0.04)",
                                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      {i === 0 && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#BD9673", flexShrink: 0 }} />}
                                      <span className="input-header" style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#7D5E42" : "rgba(0,0,0,0.45)" }}>
                                        {new Date(entry.timestamp).toLocaleString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                      {entry.duration > 0 && (
                                        <span className="input-header" style={{ fontSize: 10, color: "rgba(0,0,0,0.28)" }}>· {(entry.duration / 1000).toFixed(1)}с</span>
                                      )}
                                      {(() => {
                                        const isLocalToSite = (entry as any).direction === "local→site";
                                        return (
                                          <span className="input-header" style={{ fontSize: 10, borderRadius: 5, padding: "1px 5px", letterSpacing: 0.2, display: "inline-flex", alignItems: "center", gap: 3,
                                            background: isLocalToSite ? "rgba(190,18,60,0.08)" : "rgba(37,99,235,0.08)",
                                          }}>
                                            <span style={{ color: isLocalToSite ? "#be123c" : "#1d4ed8", fontWeight: 700 }}>{isLocalToSite ? "Плата" : "Сайт"}</span>
                                            <span style={{ color: "rgba(0,0,0,0.3)" }}>→</span>
                                            <span style={{ color: isLocalToSite ? "#1d4ed8" : "#be123c", fontWeight: 700 }}>{isLocalToSite ? "Сайт" : "Плата"}</span>
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    <div style={{ display: "flex", gap: 4 }}>
                                      {entry.added.length > 0 && (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#166534", background: "rgba(74,222,128,0.18)", padding: "2px 7px", borderRadius: 6, letterSpacing: 0.2 }}>
                                          +{entry.added.length}
                                        </span>
                                      )}
                                      {entry.updated.length > 0 && (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#92400e", background: "rgba(251,191,36,0.22)", padding: "2px 7px", borderRadius: 6, letterSpacing: 0.2 }}>
                                          ~{entry.updated.length}
                                        </span>
                                      )}
                                      {entry.deleted.length > 0 && (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#991b1b", background: "rgba(248,113,113,0.18)", padding: "2px 7px", borderRadius: 6, letterSpacing: 0.2 }}>
                                          −{entry.deleted.length}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Таблица HeroUI */}
                                  <Table
                                    aria-label="Изменения синхронизации"
                                    removeWrapper
                                    isStriped
                                    classNames={{
                                      th: "input-header text-[9px] uppercase tracking-wide bg-black/[0.025] text-black/40 h-6 py-0",
                                      td: "input-header text-[12px] py-1",
                                      tr: "border-t border-black/[0.04]",
                                    }}
                                  >
                                    <TableHeader>
                                      <TableColumn>Название</TableColumn>
                                      <TableColumn align="center">Статус</TableColumn>
                                      <TableColumn align="center">Тип</TableColumn>
                                    </TableHeader>
                                    <TableBody emptyContent="Изменений нет">
                                      {allChanges.map((c, j) => (
                                        <TableRow key={j}>
                                          <TableCell>{c.title}</TableCell>
                                          <TableCell className="text-center">
                                            <Chip size="sm" variant="flat"
                                              color={c.action === "added" ? "success" : c.action === "updated" ? "warning" : "danger"}
                                              classNames={{ content: "input-header font-bold text-[10px]" }}
                                            >
                                              {c.action === "added" ? "Добавлено" : c.action === "updated" ? "Изменено" : "Удалено"}
                                            </Chip>
                                          </TableCell>
                                          <TableCell className="text-center text-black/40">{c.type === "song" ? "Песня" : "Стопка"}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    {syncResult && !syncResult.ok && (
                      <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
                        <span className="input-header" style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>
                          ✗ Ошибка синхронизации
                        </span>
                        <div className="input-header" style={{ fontSize: 11, color: "#991b1b", marginTop: 3 }}>
                          {syncResult.error ?? "Неизвестная ошибка"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Toast */}
              {toast && (
                <div className="input-header" style={{
                  padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, flexShrink: 0,
                  background: toast.ok ? "rgba(74,222,128,0.14)" : "rgba(248,113,113,0.14)",
                  border: `1px solid ${toast.ok ? "rgba(74,222,128,0.38)" : "rgba(248,113,113,0.38)"}`,
                  color: toast.ok ? "#166534" : "#991b1b",
                }}>
                  {toast.text}
                </div>
              )}
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

// ── Scan network item (unknown networks only) ──────────────────────────────────
function ScanNetItem({ net, status, connectingTo, selectedSsid, password, connectError,
  setSelectedSsid, setPassword, setConnectError, handleConnectNew, isOpen_ }: {
  net: Network; status: WifiStatus | null;
  connectingTo: string | null; selectedSsid: string | null; password: string;
  connectError: string | null;
  setSelectedSsid: (v: string | null) => void; setPassword: (v: string) => void;
  setConnectError: (v: string | null) => void;
  handleConnectNew: (ssid: string, pwd: string) => void;
  isOpen_: (net: Network) => boolean;
}) {
  const sel = selectedSsid === net.ssid;
  const isConnecting = connectingTo === net.ssid;
  const isCurrentNet = net.ssid === status?.ssid;

  const handleClick = () => {
    if (isCurrentNet || isConnecting) return;
    if (isOpen_(net)) { handleConnectNew(net.ssid, ""); return; }
    setConnectError(null); setPassword("");
    setSelectedSsid(sel ? null : net.ssid);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 4 }}>
      <button onClick={handleClick} style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px", width: "100%",
        borderRadius: sel ? "10px 10px 0 0" : 10,
        border: isCurrentNet ? "1.5px solid rgba(125,94,66,0.3)" : sel ? "1.5px solid rgba(189,150,115,0.5)" : "1px solid transparent",
        borderBottom: sel ? "none" : undefined,
        background: isCurrentNet ? "rgba(125,94,66,0.08)" : sel ? "rgba(189,150,115,0.08)" : "rgba(255,255,255,0.45)",
        cursor: (isCurrentNet || isConnecting) ? "default" : "pointer",
        textAlign: "left", transition: "all 0.12s",
      }}>
        <SignalBars signal={net.signal} />
        <span className="input-header" style={{
          flex: 1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontWeight: isCurrentNet ? 700 : 500, color: isCurrentNet ? "#7D5E42" : "#2d2015",
        }}>
          {net.ssid}
        </span>
        {isConnecting && <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7D5E42" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
        {isCurrentNet && !isConnecting && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
        {!isCurrentNet && !isConnecting && !isOpen_(net) && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
      </button>
      {sel && !isOpen_(net) && (
        <div data-expand-panel style={{
          background: "rgba(189,150,115,0.06)", border: "1.5px solid rgba(189,150,115,0.4)",
          borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 12px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <PasswordInput value={password} onChange={(v) => { setPassword(v); setConnectError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleConnectNew(net.ssid, password); }}
            error={connectError} />
          <button onClick={() => handleConnectNew(net.ssid, password)} className="input-header" style={{
            padding: "9px 0", borderRadius: 9, border: "none",
            background: "linear-gradient(135deg,#BD9673,#7D5E42)", color: "white",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 3px 10px rgba(125,94,66,0.28)",
          }}>
            Подключиться
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shutdown Button ────────────────────────────────────────────────────────────
function RaspberryIcon({ color, size = 24 }: { color: string; size?: number }) {
  // Официальный логотип Raspberry Pi (упрощённый)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2C9.5 2 7.5 3.5 7 5.5C5.5 5.8 4.5 7 4.5 8.5C3.2 9 2.5 10.2 2.5 11.5C2.5 13.2 3.7 14.5 5.3 14.8C5.6 16.3 6.8 17.5 8.3 17.8L8.5 19.5C8.6 20.3 9.2 21 10 21H14C14.8 21 15.4 20.3 15.5 19.5L15.7 17.8C17.2 17.5 18.4 16.3 18.7 14.8C20.3 14.5 21.5 13.2 21.5 11.5C21.5 10.2 20.8 9 19.5 8.5C19.5 7 18.5 5.8 17 5.5C16.5 3.5 14.5 2 12 2ZM10.5 8C11 8 11.5 8.4 11.5 9C11.5 9.6 11 10 10.5 10C10 10 9.5 9.6 9.5 9C9.5 8.4 10 8 10.5 8ZM13.5 8C14 8 14.5 8.4 14.5 9C14.5 9.6 14 10 13.5 10C13 10 12.5 9.6 12.5 9C12.5 8.4 13 8 13.5 8ZM12 11C13.1 11 14 11.9 14 13C14 14.1 13.1 15 12 15C10.9 15 10 14.1 10 13C10 11.9 10.9 11 12 11Z"/>
    </svg>
  );
}

function ShutdownButton({ onOffline, offline }: { onOffline?: () => void; offline?: boolean }) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const HOLD_MS = 3000;

  // Кольцо снаружи кнопки: контейнер OUTER, кнопка BTN (по центру)
  const OUTER = 116;
  const BTN = 96;
  const STROKE = 7;
  const INSET = (OUTER - BTN) / 2; // 10px
  const R = (OUTER - STROKE) / 2;   // 54.5
  const C = 2 * Math.PI * R;
  const offset = C - (progress / 100) * C;

  const isOff = done || offline;

  const startHold = () => {
    if (isOff) return;
    setHolding(true);
    const startedAt = Date.now();
    intervalRef.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - startedAt) / HOLD_MS) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(intervalRef.current!);
        setHolding(false);
        setDone(true);
        fetch("/api/shutdown", { method: "POST" });
        setTimeout(() => {
          pingRef.current = setInterval(async () => {
            try {
              const r = await fetch("/api/system-status", { signal: AbortSignal.timeout(2000) });
              if (!r.ok) throw new Error();
            } catch {
              clearInterval(pingRef.current!);
              onOffline?.();
            }
          }, 2000);
        }, 4000);
      }
    }, 30);
  };

  const cancelHold = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setHolding(false);
    if (!done) setProgress(0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: OUTER, height: OUTER }}>
        {/* Кнопка внутри */}
        <button
          onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
          onTouchStart={(e) => { e.preventDefault(); startHold(); }}
          onTouchEnd={cancelHold} onTouchCancel={cancelHold}
          disabled={isOff}
          style={{
            position: "absolute",
            top: INSET, left: INSET,
            width: BTN, height: BTN,
            borderRadius: "50%", border: "none",
            background: isOff
              ? "radial-gradient(circle at 40% 40%, #94a3b8, #64748b)"
              : "radial-gradient(circle at 40% 40%, #e8457a, #9e1239)",
            boxShadow: isOff
              ? "0 4px 16px rgba(100,116,139,0.3)"
              : "0 4px 20px rgba(158,18,57,0.45)",
            cursor: isOff ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
            userSelect: "none",
            transition: "background 0.4s ease, box-shadow 0.4s ease, transform 0.1s ease",
            transform: holding ? "scale(0.95)" : "scale(1)",
          }}
        >
          <svg width="44" height="44" viewBox="0 0 32 32" fill="rgba(255,255,255,0.95)" xmlns="http://www.w3.org/2000/svg">
            <g><g>
              <path d="M13.8,6.4c-1.4-1.1-2.9-1.9-4.6-2.5c1.5,0.9,3,1.7,4.2,2.9c-0.1,1.1-1.5,1.8-3.1,1.7c-0.1-0.1,0.1-0.1,0.1-0.3C10,8.1,9.5,8.2,9.2,8c0-0.1,0.2-0.1,0.1-0.2C9,7.6,8.6,7.5,8.3,7.3c0-0.1,0.2-0.1,0.3-0.2c-0.3-0.2-0.7-0.3-1-0.6c0.1-0.1,0.2,0,0.3-0.2C7.6,6.1,7.3,5.9,7.1,5.6c0.1-0.1,0.2,0,0.3-0.1C7.3,5.2,6.9,5,6.8,4.7c0.2,0,0.3,0.1,0.5-0.1C7.1,4.3,6.7,4.2,6.6,3.8c0.1-0.1,0.3,0,0.4-0.1c0-0.3-0.2-0.5-0.3-0.8c0.3-0.1,0.7,0,1-0.1c0-0.1-0.1-0.2-0.1-0.3c0.4-0.2,0.8,0,1.2,0.1c0.1-0.2-0.1-0.2,0-0.4c0.3,0,0.6,0.2,1,0.2C9.9,2.2,9.6,2.2,9.6,2c0.4,0,0.7,0.2,1,0.4c0.1-0.1,0-0.2,0.1-0.4c0.3,0.1,0.5,0.3,0.8,0.5c0.2,0,0.1-0.2,0.2-0.3c0.3,0.1,0.5,0.4,0.7,0.5c0.2,0,0.1-0.2,0.2-0.3c0.3,0.2,0.5,0.5,0.7,0.7c0.2,0,0.1-0.2,0.3-0.2c0.6,0.7,1.2,1.5,1.1,2.5C14.7,5.9,14.3,6.2,13.8,6.4L13.8,6.4z"/>
              <path d="M23.5,7.1c0.1,0.1,0.2,0.1,0.3,0.1c-0.3,0.3-0.7,0.3-1.1,0.5c0,0.1,0.1,0.1,0.1,0.2c-0.3,0.2-0.8,0.1-1.1,0.2c-0.1,0.1,0.1,0.2,0,0.3c-0.4,0.1-0.8,0-1.3-0.1c-0.9-0.2-1.6-0.6-1.9-1.5c1.2-1.3,2.7-2.1,4.2-2.9c-1.7,0.6-3.2,1.4-4.6,2.4c-0.6-0.2-0.9-0.7-0.9-1.3c0-0.7,0.6-1.8,1.2-2.3l0.2,0.3c0.3-0.2,0.5-0.6,0.8-0.7c0.1,0.1,0,0.3,0.2,0.3c0.2-0.1,0.4-0.4,0.7-0.5c0.1,0.1,0,0.2,0.2,0.3C20.8,2.4,21,2.1,21.4,2c0,0.1-0.1,0.2,0,0.4C21.7,2.2,22,2,22.4,2c0,0.1-0.2,0.2-0.1,0.4c0.3,0,0.6-0.2,1-0.2c0,0.1-0.1,0.2,0,0.4c0.4-0.1,0.8-0.2,1.2-0.1c0,0.1-0.1,0.2-0.1,0.3c0.3,0.1,0.7,0,1,0.1C25.3,3.2,25,3.4,25,3.7c0.1,0.1,0.3,0,0.4,0.1c-0.1,0.4-0.5,0.5-0.6,0.8c0.1,0.2,0.3,0,0.4,0.1c-0.1,0.3-0.5,0.5-0.7,0.8c0.1,0.2,0.2,0.1,0.3,0.1c-0.2,0.3-0.5,0.4-0.7,0.7c0.1,0.1,0.2,0.1,0.3,0.2C24.2,6.8,23.8,6.9,23.5,7.1L23.5,7.1z"/>
            </g><g>
              <path d="M15.4,16c0,1.8-1.4,3.6-3.2,4c-1.8,0.4-3.4-0.9-3.5-2.7c-0.1-1.8,1.2-3.6,2.9-4C13.7,12.7,15.4,14,15.4,16z"/>
              <path d="M23.4,16.9c0,2.1-1.8,3.4-3.8,2.8c-1.8-0.6-3.1-2.5-2.8-4.4c0.3-1.8,2.1-2.9,3.9-2.2C22.3,13.7,23.4,15.3,23.4,16.9L23.4,16.9z"/>
              <path d="M16.1,19.4c1,0,2,0.4,2.7,1.2c1.2,1.3,1.1,3.2-0.2,4.3c-1.3,1.1-3.4,1.2-4.7,0.1c-1-0.8-1.4-1.8-1.2-3.1c0.3-1.3,1.2-2,2.4-2.4C15.4,19.5,15.7,19.4,16.1,19.4L16.1,19.4z"/>
              <path d="M19.8,25.3c0.1-1,0.5-2,1.3-2.9c0.5-0.5,1-1,1.5-1.4c0.3-0.2,0.6-0.3,0.9-0.4c0.6-0.1,1.1,0.1,1.3,0.7c0.4,1,0.5,2,0,3c-0.6,1.4-1.7,2.3-3.2,2.6c-0.1,0-0.3,0-0.5,0C20.2,27,19.8,26.6,19.8,25.3z"/>
              <path d="M6.9,22.7c0,0,0-0.2,0-0.3c0.1-1.1,0.7-1.5,1.8-1.2c1.7,0.5,3.3,2.5,3.4,4.3c0,1.1-0.5,1.6-1.6,1.4c-1.5-0.2-2.5-1-3.1-2.3C7,24,6.9,23.4,6.9,22.7L6.9,22.7z"/>
              <path d="M16.2,12.8c-0.8,0-1.6-0.1-2.3-0.5c-1.3-0.7-1.3-1.6-0.2-2.4c1.5-1.1,3.5-1,4.9,0.2c0.1,0.1,0.2,0.2,0.3,0.3c0.5,0.6,0.4,1.2-0.2,1.7c-0.5,0.4-1.1,0.5-1.7,0.6C16.7,12.8,16.4,12.8,16.2,12.8L16.2,12.8z"/>
              <path d="M16,30c-1.2,0-2.2-0.5-3.1-1.4c-0.4-0.4-0.4-0.8,0.1-1.1c0.7-0.4,1.4-0.6,2.2-0.7c1-0.1,2-0.1,3,0.2c0.2,0.1,0.5,0.2,0.7,0.3c0.6,0.3,0.7,0.6,0.2,1.2c0,0,0,0-0.1,0.1C18.3,29.5,17.3,30,16,30z"/>
              <path d="M7.8,16.8c0,1.1-0.2,2.1-0.6,3.1c-0.1,0.3-0.2,0.5-0.4,0.7C6.5,21,6.3,21,6,20.7c-1.4-1.4-1.2-4.1,0.5-5.3c0.6-0.5,1-0.4,1.2,0.4C7.7,16.1,7.8,16.5,7.8,16.8L7.8,16.8z"/>
              <path d="M26.9,18.3c0,0.8-0.3,1.7-0.9,2.4c-0.3,0.3-0.5,0.3-0.8,0c-0.3-0.4-0.5-0.9-0.6-1.4c-0.3-1-0.4-2.1-0.3-3.2c0-0.2,0.1-0.5,0.2-0.7c0.2-0.4,0.4-0.5,0.8-0.2C26.3,15.8,26.9,16.9,26.9,18.3z"/>
              <path d="M7.5,13.9c-0.1-1.3,0.3-2.5,1.4-3.3c1.1-0.8,2.3-1,3.6-0.8c0,0.3-0.2,0.5-0.3,0.7c-0.7,0.9-1.6,1.6-2.4,2.3c-0.5,0.4-1,0.7-1.5,1C7.9,13.9,7.7,14.1,7.5,13.9z"/>
              <path d="M24.6,14c-0.2,0.1-0.5,0-0.7-0.2c-0.7-0.4-1.4-0.9-2-1.4c-0.7-0.6-1.3-1.2-1.9-1.8c-0.1-0.2-0.3-0.4-0.3-0.6c0.6-0.3,2.6-0.2,3.6,0.7C24.3,11.5,24.9,13.1,24.6,14z"/>
            </g></g>
          </svg>
        </button>

        {/* Кольцо прогресса поверх и снаружи кнопки */}
        <svg
          width={OUTER} height={OUTER}
          style={{
            position: "absolute", top: 0, left: 0,
            transform: "rotate(-90deg)",
            pointerEvents: "none",
            opacity: holding ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        >
          <circle cx={OUTER / 2} cy={OUTER / 2} r={R} fill="none" stroke="rgba(158,18,57,0.18)" strokeWidth={STROKE} />
          <circle
            cx={OUTER / 2} cy={OUTER / 2} r={R} fill="none"
            stroke="#9e1239"
            strokeWidth={STROKE}
            strokeDasharray={C} strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
      </div>

      <span className="input-header" style={{ fontSize: 12, color: isOff ? "#94a3b8" : "rgba(0,0,0,0.4)", textAlign: "center" }}>
        {offline ? "Плата выключена" : done ? "Выключается..." : holding ? "Держите..." : "Удерживайте для выключения"}
      </span>
    </div>
  );
}

// ── Micro components ───────────────────────────────────────────────────────────
function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="input-header" style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.35)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, ...style }}>
      {children}
    </div>
  );
}

function NetRow({ label, value, dot, mono, extra }: { label: string; value: string; dot?: "green" | "gray"; mono?: boolean; extra?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {extra}
        {dot && <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot === "green" ? "#4ade80" : "#94a3b8", boxShadow: dot === "green" ? "0 0 0 2px rgba(74,222,128,0.22)" : "none" }} />}
        <span className="input-header" style={{ fontSize: 13, fontWeight: 600, color: "#2d2015", fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.75)",
  borderRadius: 16, padding: "12px 14px", display: "flex", flexDirection: "column",
};
const smallBtn: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(125,94,66,0.25)",
  background: "rgba(125,94,66,0.08)", color: "#7D5E42", fontSize: 12, fontWeight: 600,
  cursor: "pointer", whiteSpace: "nowrap",
};

// ── Utils ──────────────────────────────────────────────────────────────────────
function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return many;
  if (m10 === 1) return one;
  if (m10 >= 2 && m10 <= 4) return few;
  return many;
}

function fmtDate(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

function fmtAgo(ts: number): string {
  if (!ts) return "—";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "только что";
  if (sec < 3600) return `${Math.floor(sec / 60)} мин назад`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} ч назад`;
  return `${Math.floor(sec / 86400)} д назад`;
}

function fmtBps(bps: number): string {
  if (!bps || bps < 100) return "0";
  if (bps < 1024) return `${bps} Б/с`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} КБ/с`;
  return `${(bps / (1024 * 1024)).toFixed(1)} МБ/с`;
}
