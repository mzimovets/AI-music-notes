"use client";

import { Modal, ModalContent } from "@heroui/modal";
import { useEffect, useState, useCallback, useRef } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface WifiStatus {
  ok: boolean;
  ssid: string;
  mode: "client" | "ap" | "unknown";
  ip: string;
  connected: boolean;
  apDevices?: number;
  apActive?: boolean;
}

interface Network {
  ssid: string;
  signal: number;
  security: string;
  inUse: boolean;
}

interface SyncLogEntry {
  ts: number;
  level: "info" | "warn" | "error";
  line: string;
}

interface SyncResult {
  ok: boolean;
  error?: string;
  duration: number;
  logs: SyncLogEntry[];
  startedAt: number;
}

// ── Signal bars ────────────────────────────────────────────────────────────────
function SignalBars({ signal }: { signal: number }) {
  const bars = signal >= 75 ? 4 : signal >= 50 ? 3 : signal >= 25 ? 2 : 1;
  const color = signal >= 60 ? "#4ade80" : signal >= 30 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
      {[1, 2, 3, 4].map((b) => (
        <div key={b} style={{ width: 3, height: 4 + b * 3, background: b <= bars ? color : "rgba(0,0,0,0.12)", borderRadius: 2 }} />
      ))}
    </div>
  );
}

// ── Password input with eye ────────────────────────────────────────────────────
function PasswordInput({
  value, onChange, onKeyDown, error,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  error?: string | null;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          placeholder="Пароль"
          value={value}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="input-header"
          style={{
            width: "100%", padding: "9px 36px 9px 12px",
            borderRadius: 9,
            border: error ? "1.5px solid rgba(248,113,113,0.7)" : "1.5px solid rgba(0,0,0,0.09)",
            background: error ? "rgba(255,235,235,0.8)" : "rgba(255,255,255,0.9)",
            fontSize: 14, color: "#2d2015", outline: "none",
            boxSizing: "border-box", transition: "border 0.15s, background 0.15s",
          }}
        />
        {/* Eye toggle */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShow((v) => !v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShow((v) => !v); }}
          style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            cursor: "pointer", display: "flex", alignItems: "center", color: "rgba(0,0,0,0.3)",
          }}
        >
          {show ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </div>
      </div>
      {/* Inline error */}
      {error && (
        <span className="input-header" style={{ fontSize: 11, color: "#dc2626", paddingLeft: 4 }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function WiFiManagerModal({ isOpen, onClose }: Props) {
  const [status, setStatus] = useState<WifiStatus | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((text: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Status ────────────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/wifi-manager");
      const data = await res.json();
      setStatus(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, 10_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isOpen, fetchStatus]);

  // Сброс при закрытии
  useEffect(() => {
    if (!isOpen) {
      setSelectedSsid(null);
      setPassword("");
      setConnectError(null);
      setNetworks([]);
      setSyncResult(null);
      setLogOpen(false);
    }
  }, [isOpen]);

  // ── Scan ──────────────────────────────────────────────────────────────────────
  const handleScan = async () => {
    setScanning(true);
    setSelectedSsid(null);
    setPassword("");
    setConnectError(null);
    try {
      const res = await fetch("/api/wifi-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      const data = await res.json();
      if (data.ok) setNetworks(data.networks ?? []);
      else showToast(data.error ?? "Ошибка сканирования", false);
    } catch {
      showToast("Ошибка сети", false);
    } finally {
      setScanning(false);
    }
  };

  // ── Connect ───────────────────────────────────────────────────────────────────
  const handleConnect = async (ssid: string) => {
    setLoading(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/wifi-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", ssid, password }),
      });
      const data = await res.json();
      if (data.ok) {
        // Обновляем inUse в локальном списке сетей сразу, не ждём нового скана
        setNetworks((prev) => prev.map((n) => ({ ...n, inUse: n.ssid === ssid })));
        setSelectedSsid(null);
        setPassword("");
        setConnectError(null);
        if (data.ssid) setStatus(data);
        else fetchStatus();
      } else {
        setConnectError(data.error ?? "Не удалось подключиться");
      }
    } catch {
      setConnectError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  // ── Mode ──────────────────────────────────────────────────────────────────────
  const handleMode = async (mode: "ap" | "client") => {
    if (loading || status?.mode === mode) return;
    setLoading(true);
    // Оптимистичное обновление
    setStatus((prev) => prev ? { ...prev, mode } : prev);
    setSelectedSsid(null);
    setNetworks([]);
    setPassword("");
    setConnectError(null);
    try {
      const res = await fetch("/api/wifi-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mode", mode }),
      });
      const data = await res.json();
      if (!data.ok) showToast(data.error ?? "Ошибка", false);
      await fetchStatus();
    } catch {
      showToast("Ошибка сети", false);
    } finally {
      setLoading(false);
    }
  };

  // ── Sync DB ───────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncProgress(5);
    let p = 5;
    progressTimer.current = setInterval(() => {
      p = Math.min(p + Math.random() * 5 + 2, 85);
      setSyncProgress(p);
    }, 400);
    const startedAt = Date.now();
    try {
      const res = await fetch("/api/update-db", { method: "POST" });
      const data = await res.json();
      if (progressTimer.current) clearInterval(progressTimer.current);
      setSyncProgress(100);
      setSyncResult({ ...data, startedAt });
      setLogOpen(true);
      setTimeout(() => setSyncProgress(0), 700);
    } catch (e: any) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setSyncProgress(0);
      setSyncResult({ ok: false, error: String(e?.message ?? "Ошибка"), duration: 0, logs: [], startedAt });
      setLogOpen(true);
    } finally {
      setSyncing(false);
    }
  };

  const isClient = status?.mode === "client";
  const isAP = status?.mode === "ap";
  const isOpen_ = (net: Network) => !net.security || net.security === "—" || net.security === "";

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      placement="center"
      backdrop="blur"
      size="sm"
      hideCloseButton
      scrollBehavior="normal"
    >
      <ModalContent style={{
        background: "rgba(245,242,238,0.88)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        border: "1px solid rgba(255,255,255,0.6)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        borderRadius: 24,
        height: 520,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {() => (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 12px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#BD9673,#7D5E42)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 3px 10px rgba(125,94,66,0.35)",
                }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <circle cx="12" cy="20" r="1" fill="white" stroke="none" />
                  </svg>
                </div>
                <span className="input-header" style={{ fontSize: 16, fontWeight: 700, color: "#2d2015", letterSpacing: -0.3 }}>Wi-Fi</span>
              </div>

              {/* AP indicator badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                padding: "5px 10px", borderRadius: 8, background: "rgba(0,0,0,0.06)",
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: status?.apActive ? "#4ade80" : "#94a3b8",
                  boxShadow: status?.apActive ? "0 0 0 2px rgba(74,222,128,0.25)" : "none",
                  flexShrink: 0,
                }} />
                <span className="input-header" style={{ fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.45)" }}>AP</span>
              </div>

              <button onClick={onClose} style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "rgba(0,0,0,0.07)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* ── Status card ──────────────────────────────────────────────── */}
            <div style={{ padding: "0 16px 10px", flexShrink: 0 }}>
              <div style={{
                background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.75)",
                borderRadius: 16, padding: "11px 14px", display: "flex", flexDirection: "column", gap: 6,
              }}>
                {/* wlan1 — клиент */}
                <StatusRow label="Сеть" value={status?.ssid ?? "—"} bold />
                <StatusRow label="IP (wlan1)" value={status?.ip ?? "—"} mono />
                {/* wlan0 — точка доступа */}
                <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>Точка доступа</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="input-header" style={{
                      fontSize: 13, fontWeight: 700,
                      color: (status?.apDevices ?? 0) > 0 ? "#7D5E42" : "rgba(0,0,0,0.35)",
                    }}>
                      {status?.apActive
                        ? (status.apDevices ?? 0) > 0
                          ? `${status.apDevices} ${plural(status.apDevices!, "устройство", "устройства", "устройств")}`
                          : "нет устройств"
                        : "выкл"}
                    </span>
                    {status?.apActive && (
                      <div style={{
                        width: 7, height: 7, borderRadius: "50%", background: "#4ade80",
                        boxShadow: "0 0 0 2px rgba(74,222,128,0.3)",
                      }} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Scrollable body ──────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>

              {isClient && (
                <>
                  {/* ── Update DB ────────────────────────────────────────── */}
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ display: "flex" }}>
                      <button onClick={handleSync} disabled={syncing} className="input-header"
                        style={{
                          flex: 1, padding: "12px 16px",
                          borderRadius: syncResult ? "14px 0 0 14px" : 14,
                          border: "1px solid rgba(255,255,255,0.7)",
                          borderRight: syncResult ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.7)",
                          background: syncing ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.55)",
                          cursor: syncing ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          transition: "background 0.15s",
                        }}
                      >
                        {syncing ? (
                          <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7D5E42" strokeWidth="2.5">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7D5E42" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                        )}
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#7D5E42" }}>
                          {syncing ? "Обновляю..." : "Обновить БД"}
                        </span>
                      </button>
                      {syncResult && (
                        <div role="button" tabIndex={0}
                          onClick={() => setLogOpen((v) => !v)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLogOpen((v) => !v); }}
                          style={{
                            width: 40, cursor: "pointer",
                            borderRadius: "0 14px 14px 0",
                            border: "1px solid rgba(255,255,255,0.7)", borderLeft: "none",
                            background: logOpen ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.55)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke={syncResult.ok ? "rgba(0,0,0,0.35)" : "#dc2626"}
                            strokeWidth="2.5" strokeLinecap="round"
                            style={{ transform: logOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    {syncing && syncProgress > 0 && (
                      <div style={{ height: 3, background: "rgba(0,0,0,0.07)", borderRadius: "0 0 4px 4px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", background: "linear-gradient(90deg,#BD9673,#7D5E42)",
                          width: `${syncProgress}%`, transition: "width 0.4s ease",
                        }} />
                      </div>
                    )}

                    {/* Log panel */}
                    {logOpen && syncResult && (
                      <div style={{
                        background: "rgba(22,14,6,0.87)", backdropFilter: "blur(8px)",
                        borderRadius: "0 0 14px 14px",
                        border: "1px solid rgba(255,255,255,0.1)", borderTop: "none",
                        padding: "10px 12px", maxHeight: 148, overflowY: "auto",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                            {new Date(syncResult.startedAt).toLocaleTimeString("ru")}
                          </span>
                          <div style={{ display: "flex", gap: 10 }}>
                            <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                              {(syncResult.duration / 1000).toFixed(1)}с
                            </span>
                            {syncResult.logs.length > 0 && (
                              <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                                {formatBytes(syncResult.logs.reduce((s, l) => s + l.line.length, 0))}
                              </span>
                            )}
                          </div>
                        </div>
                        {syncResult.logs.length > 0 ? (
                          syncResult.logs.map((e, i) => (
                            <div key={i} style={{
                              fontFamily: "monospace", fontSize: 11, lineHeight: 1.55,
                              color: e.level === "error" ? "#f87171" : e.level === "warn" ? "#fbbf24" : "#a3e635",
                              wordBreak: "break-all",
                            }}>{e.line}</div>
                          ))
                        ) : (
                          <div style={{ fontFamily: "monospace", fontSize: 11, color: syncResult.ok ? "#a3e635" : "#f87171" }}>
                            {syncResult.ok ? "✓ Готово" : `✗ ${syncResult.error ?? "Ошибка"}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Scan ─────────────────────────────────────────────── */}
                  <button onClick={handleScan} disabled={scanning} className="input-header"
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: 14, flexShrink: 0,
                      border: "1px solid rgba(255,255,255,0.7)",
                      background: scanning ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.55)",
                      cursor: scanning ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {scanning ? (
                      <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7D5E42" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7D5E42" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <circle cx="12" cy="20" r="1" fill="#7D5E42" stroke="none" />
                      </svg>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#7D5E42" }}>
                      {scanning ? "Сканирую..." : "Сканировать сети"}
                    </span>
                  </button>

                  {/* ── Network list ─────────────────────────────────────── */}
                  {networks.map((net) => {
                    const sel = selectedSsid === net.ssid;
                    const open = isOpen_(net);
                    return (
                      <div key={net.ssid} style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            if (open) {
                              handleConnect(net.ssid);
                            } else {
                              setConnectError(null);
                              setPassword("");
                              setSelectedSsid(sel ? null : net.ssid);
                            }
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 14px", width: "100%",
                            borderRadius: sel ? "13px 13px 0 0" : 13,
                            border: net.inUse
                              ? "1.5px solid rgba(125,94,66,0.4)"
                              : sel
                                ? "1.5px solid rgba(189,150,115,0.5)"
                                : "1px solid rgba(255,255,255,0.65)",
                            borderBottom: sel ? "none" : undefined,
                            background: net.inUse
                              ? "rgba(189,150,115,0.2)"
                              : sel
                                ? "rgba(189,150,115,0.1)"
                                : "rgba(255,255,255,0.48)",
                            cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                          }}
                        >
                          <SignalBars signal={net.signal} />
                          <span className="input-header" style={{
                            flex: 1, fontSize: 14,
                            fontWeight: net.inUse ? 700 : 500,
                            color: net.inUse ? "#7D5E42" : "#2d2015",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {net.ssid}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                            {net.inUse && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            {!open && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                          </div>
                        </button>

                        {/* Inline password form */}
                        {sel && !open && (
                          <div style={{
                            background: "rgba(189,150,115,0.07)",
                            border: "1.5px solid rgba(189,150,115,0.5)",
                            borderTop: "none", borderRadius: "0 0 13px 13px",
                            padding: "12px 14px",
                            display: "flex", flexDirection: "column", gap: 8,
                          }}>
                            <PasswordInput
                              value={password}
                              onChange={(v) => { setPassword(v); setConnectError(null); }}
                              onKeyDown={(e) => { if (e.key === "Enter") handleConnect(net.ssid); }}
                              error={connectError}
                            />
                            <button
                              onClick={() => handleConnect(net.ssid)}
                              disabled={loading}
                              className="input-header"
                              style={{
                                width: "100%", padding: "9px 0", borderRadius: 9, border: "none",
                                background: "linear-gradient(135deg,#BD9673,#7D5E42)",
                                color: "white", fontSize: 13, fontWeight: 700,
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.6 : 1,
                                boxShadow: "0 3px 10px rgba(125,94,66,0.28)",
                                transition: "opacity 0.15s",
                              }}
                            >
                              {loading ? "Подключение..." : "Подключиться"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Нет подключённых сетей после скана */}
              {isClient && networks.length === 0 && !scanning && (
                <div style={{
                  background: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.55)",
                  borderRadius: 14, padding: "16px", textAlign: "center",
                }}>
                  <p className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.35)", margin: 0 }}>
                    Нажмите «Сканировать сети» для поиска
                  </p>
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function StatusRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span className="input-header" style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>{label}</span>
      <span className="input-header" style={{ fontSize: 13, fontWeight: bold ? 600 : 400, color: "#2d2015", fontFamily: mono ? "monospace" : "inherit" }}>
        {value}
      </span>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return many;
  if (m10 === 1) return one;
  if (m10 >= 2 && m10 <= 4) return few;
  return many;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}
