"use client";

import { Modal, ModalContent, ModalBody } from "@heroui/modal";
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
}

interface Network {
  ssid: string;
  signal: number;
  security: string;
  inUse: boolean;
}

// ── Signal bars ────────────────────────────────────────────────────────────────
function SignalBars({ signal }: { signal: number }) {
  const bars = signal >= 75 ? 4 : signal >= 50 ? 3 : signal >= 25 ? 2 : 1;
  const color = signal >= 60 ? "#4ade80" : signal >= 30 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex items-end gap-[3px]">
      {[1, 2, 3, 4].map((b) => (
        <div
          key={b}
          style={{
            width: 3,
            height: 4 + b * 3,
            background: b <= bars ? color : "rgba(0,0,0,0.12)",
            borderRadius: 2,
            transition: "background 0.2s",
          }}
        />
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function WiFiManagerModal({ isOpen, onClose }: Props) {
  const [status, setStatus] = useState<WifiStatus | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (text: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // ── Status fetch ─────────────────────────────────────────────────────────────
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

  // ── Actions ───────────────────────────────────────────────────────────────────
  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/wifi-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      const data = await res.json();
      if (data.ok) setNetworks(data.networks ?? []);
      else showToast(data.error ?? "Ошибка", false);
    } catch {
      showToast("Ошибка сети", false);
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedSsid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/wifi-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", ssid: selectedSsid, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setSelectedSsid(null);
        setPassword("");
        setStatus(data);
      } else {
        showToast(data.error ?? "Ошибка подключения", false);
      }
    } catch {
      showToast("Ошибка сети", false);
    } finally {
      setLoading(false);
    }
  };

  const handleMode = async (mode: "ap" | "client") => {
    if (loading) return;
    setLoading(true);
    // Оптимистичное обновление
    setStatus((prev) => prev ? { ...prev, mode } : prev);
    setSelectedSsid(null);
    setNetworks([]);
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

  const isClient = status?.mode === "client";
  const isAP = status?.mode === "ap";

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      placement="center"
      backdrop="blur"
      size="sm"
      scrollBehavior="inside"
      hideCloseButton
    >
      <ModalContent
        style={{
          background: "rgba(245,242,238,0.82)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.55)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          borderRadius: 24,
        }}
      >
        {() => (
          <ModalBody className="p-0 overflow-hidden">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg,#BD9673,#7D5E42)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(125,94,66,0.35)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <circle cx="12" cy="20" r="1" fill="white" stroke="none" />
                  </svg>
                </div>
                <span style={{ fontSize: 17, fontWeight: 700, color: "#2d2015", letterSpacing: -0.3 }} className="input-header">
                  Wi-Fi
                </span>
              </div>

              {/* Mode switcher — top right */}
              <div
                style={{
                  display: "flex",
                  background: "rgba(0,0,0,0.07)",
                  borderRadius: 12,
                  padding: 3,
                  gap: 2,
                }}
              >
                {(["client", "ap"] as const).map((m) => {
                  const active = status?.mode === m;
                  const label = m === "client" ? "Клиент" : "AP";
                  return (
                    <button
                      key={m}
                      onClick={() => handleMode(m)}
                      disabled={loading}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 9,
                        fontSize: 12,
                        fontWeight: 600,
                        border: "none",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.18s",
                        background: active
                          ? m === "client"
                            ? "linear-gradient(135deg,#BD9673,#7D5E42)"
                            : "linear-gradient(135deg,#f59e0b,#d97706)"
                          : "transparent",
                        color: active ? "white" : "rgba(0,0,0,0.45)",
                        boxShadow: active ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
                      }}
                      className="input-header"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(0,0,0,0.07)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* ── Status card ───────────────────────────────────────────────── */}
            <div style={{ margin: "0 16px 4px" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.55)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  borderRadius: 16,
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Row
                    label="Сеть"
                    value={status?.ssid ?? "—"}
                    valueStyle={{ fontWeight: 600, color: "#2d2015" }}
                  />
                  <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />
                  <Row
                    label="IP"
                    value={status?.ip ?? "—"}
                    valueStyle={{ fontFamily: "monospace", fontSize: 13, color: "#2d2015" }}
                  />
                </div>
              </div>
            </div>

            {/* ── Client section ────────────────────────────────────────────── */}
            {isClient && (
              <div style={{ margin: "8px 16px 0" }}>

                {/* Scan button */}
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.7)",
                    background: scanning
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(255,255,255,0.55)",
                    cursor: scanning ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "background 0.15s",
                  }}
                >
                  {scanning ? (
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7D5E42" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7D5E42" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                      <circle cx="12" cy="20" r="1" fill="#7D5E42" stroke="none" />
                    </svg>
                  )}
                  <span
                    style={{ fontSize: 14, fontWeight: 600, color: "#7D5E42" }}
                    className="input-header"
                  >
                    {scanning ? "Сканирую..." : "Сканировать сети"}
                  </span>
                </button>

                {/* Networks list */}
                {networks.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {networks.map((net) => {
                      const selected = selectedSsid === net.ssid;
                      const secured = net.security && net.security !== "—" && net.security !== "";
                      return (
                        <button
                          key={net.ssid}
                          onClick={() => {
                            setSelectedSsid(selected ? null : net.ssid);
                            setPassword("");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            borderRadius: 13,
                            border: selected
                              ? "1.5px solid rgba(189,150,115,0.5)"
                              : "1px solid rgba(255,255,255,0.6)",
                            background: selected
                              ? "rgba(189,150,115,0.13)"
                              : "rgba(255,255,255,0.45)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.15s",
                          }}
                        >
                          <SignalBars signal={net.signal} />
                          <span
                            style={{
                              flex: 1,
                              fontSize: 14,
                              fontWeight: net.inUse ? 700 : 500,
                              color: net.inUse ? "#7D5E42" : "#2d2015",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            className="input-header"
                          >
                            {net.ssid}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            {net.inUse && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            {secured && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Connect form */}
                {selectedSsid && (
                  <div
                    style={{
                      marginTop: 8,
                      background: "rgba(255,255,255,0.55)",
                      border: "1px solid rgba(255,255,255,0.7)",
                      borderRadius: 16,
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,0.4)" }} className="input-header">
                      {selectedSsid}
                    </span>
                    <input
                      type="password"
                      placeholder="Пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1.5px solid rgba(0,0,0,0.1)",
                        background: "rgba(255,255,255,0.8)",
                        fontSize: 14,
                        color: "#2d2015",
                        outline: "none",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      onClick={handleConnect}
                      disabled={loading}
                      style={{
                        width: "100%",
                        padding: "11px 0",
                        borderRadius: 12,
                        border: "none",
                        background: "linear-gradient(135deg,#BD9673,#7D5E42)",
                        color: "white",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.6 : 1,
                        boxShadow: "0 4px 14px rgba(125,94,66,0.35)",
                        transition: "opacity 0.15s",
                      }}
                      className="input-header"
                    >
                      {loading ? "Подключение..." : "Подключиться"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── AP placeholder ─────────────────────────────────────────────── */}
            {isAP && (
              <div
                style={{
                  margin: "8px 16px 0",
                  background: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(255,255,255,0.6)",
                  borderRadius: 16,
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>📡</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#2d2015", margin: 0 }} className="input-header">
                  Точка доступа активна
                </p>
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginTop: 4, marginBottom: 0 }} className="input-header">
                  Устройства могут подключаться к вашей сети
                </p>
              </div>
            )}

            {/* ── Toast ─────────────────────────────────────────────────────── */}
            <div
              style={{
                margin: "8px 16px",
                minHeight: toast ? undefined : 0,
                overflow: "hidden",
                transition: "min-height 0.2s",
              }}
            >
              {toast && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    background: toast.ok
                      ? "rgba(74,222,128,0.15)"
                      : "rgba(248,113,113,0.15)",
                    border: `1px solid ${toast.ok ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`,
                    color: toast.ok ? "#166534" : "#991b1b",
                  }}
                  className="input-header"
                >
                  {toast.text}
                </div>
              )}
            </div>

            <div style={{ height: 4 }} />
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
}

// ── Small helper ───────────────────────────────────────────────────────────────
function Row({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: 500 }} className="input-header">
        {label}
      </span>
      <span style={{ fontSize: 13, ...valueStyle }} className="input-header">
        {value}
      </span>
    </div>
  );
}
