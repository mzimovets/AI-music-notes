"use client";

import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
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

// ── Signal icon ────────────────────────────────────────────────────────────────
function SignalIcon({ signal }: { signal: number }) {
  const bars = signal >= 75 ? 4 : signal >= 50 ? 3 : signal >= 25 ? 2 : 1;
  const color = signal >= 50 ? "#22c55e" : signal >= 25 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-end gap-[2px]" title={`${signal}%`}>
      {[1, 2, 3, 4].map((b) => (
        <div
          key={b}
          style={{
            width: 4,
            height: 4 + b * 3,
            background: b <= bars ? color : "#d1d5db",
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

// ── Lock icon ──────────────────────────────────────────────────────────────────
function LockIcon({ secured }: { secured: boolean }) {
  if (!secured) return null;
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function WiFiManagerModal({ isOpen, onClose }: Props) {
  const [status, setStatus] = useState<WifiStatus | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch status ─────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/wifi-manager");
      const data = await res.json();
      setStatus(data);
    } catch {
      // ignore
    }
  }, []);

  // ── Auto-refresh every 10s ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, 10_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, fetchStatus]);

  const showMessage = (text: string, ok: boolean) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Scan ─────────────────────────────────────────────────────────────────────
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
      else showMessage(data.error ?? "Ошибка сканирования", false);
    } catch {
      showMessage("Ошибка сети", false);
    } finally {
      setScanning(false);
    }
  };

  // ── Connect ───────────────────────────────────────────────────────────────────
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
        showMessage(data.message ?? "Подключено", true);
        setSelectedSsid(null);
        setPassword("");
        setStatus(data);
      } else {
        showMessage(data.error ?? "Ошибка подключения", false);
      }
    } catch {
      showMessage("Ошибка сети", false);
    } finally {
      setLoading(false);
    }
  };

  // ── Switch mode ───────────────────────────────────────────────────────────────
  const handleMode = async (mode: "ap" | "client") => {
    setLoading(true);
    try {
      const res = await fetch("/api/wifi-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mode", mode }),
      });
      const data = await res.json();
      if (data.ok) {
        showMessage(data.message ?? "Режим изменён", true);
        await fetchStatus();
      } else {
        showMessage(data.error ?? "Ошибка", false);
      }
    } catch {
      showMessage("Ошибка сети", false);
    } finally {
      setLoading(false);
    }
  };

  const modeLabel = status?.mode === "ap" ? "Точка доступа" : status?.mode === "client" ? "Клиент" : "—";

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      placement="center"
      backdrop="blur"
      size="sm"
      scrollBehavior="inside"
    >
      <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl">
        {() => (
          <>
            <ModalHeader className="flex items-center gap-3 pt-5 pb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#BD9673] to-[#7D5E42] flex items-center justify-center shadow-md flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                  <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                  <circle cx="12" cy="20" r="1" fill="white" stroke="none" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 input-header">Wi-Fi менеджер</span>
            </ModalHeader>

            <ModalBody className="pb-5 flex flex-col gap-4">

              {/* ── Статус ──────────────────────────────────────────────────── */}
              <div className="rounded-xl bg-white/60 border border-white/50 px-4 py-3 shadow-sm flex flex-col gap-1.5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide input-header mb-1">Статус</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 input-header">Сеть</span>
                  <span className="text-sm font-medium text-gray-800 input-header">{status?.ssid ?? "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 input-header">IP адрес</span>
                  <span className="text-sm font-medium text-gray-800 input-header tabular-nums">{status?.ip ?? "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 input-header">Режим</span>
                  <span className={`text-sm font-semibold input-header ${status?.mode === "ap" ? "text-amber-600" : status?.mode === "client" ? "text-green-600" : "text-gray-400"}`}>
                    {modeLabel}
                  </span>
                </div>
              </div>

              {/* ── Переключатель режима ─────────────────────────────────────── */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleMode("client")}
                  disabled={loading || status?.mode === "client"}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold input-header transition-all ${
                    status?.mode === "client"
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-white/60 border border-white/50 text-gray-600 hover:bg-white/80"
                  }`}
                >
                  Клиент
                </button>
                <button
                  onClick={() => handleMode("ap")}
                  disabled={loading || status?.mode === "ap"}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold input-header transition-all ${
                    status?.mode === "ap"
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-white/60 border border-white/50 text-gray-600 hover:bg-white/80"
                  }`}
                >
                  Точка доступа
                </button>
              </div>

              {/* ── Сканирование ─────────────────────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide input-header">Сети</span>
                  <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="flex items-center gap-1.5 text-xs font-semibold input-header text-[#7D5E42] hover:text-[#BD9673] transition-colors disabled:opacity-50"
                  >
                    {scanning ? (
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                    )}
                    {scanning ? "Сканирую..." : "Сканировать"}
                  </button>
                </div>

                {networks.length > 0 ? (
                  <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-0.5">
                    {networks.map((net) => (
                      <button
                        key={net.ssid}
                        onClick={() => {
                          setSelectedSsid(selectedSsid === net.ssid ? null : net.ssid);
                          setPassword("");
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          selectedSsid === net.ssid
                            ? "bg-[#BD9673]/20 border border-[#BD9673]/40"
                            : "bg-white/50 border border-white/40 hover:bg-white/70"
                        }`}
                      >
                        <SignalIcon signal={net.signal} />
                        <span className="flex-1 text-sm font-medium text-gray-800 input-header truncate">
                          {net.ssid}
                          {net.inUse && (
                            <span className="ml-1.5 text-xs text-green-600 font-semibold">✓</span>
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <LockIcon secured={net.security !== "—" && net.security !== ""} />
                          <span className="text-xs text-gray-400 input-header tabular-nums">{net.signal}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm input-header">
                    Нажмите «Сканировать» для поиска сетей
                  </div>
                )}
              </div>

              {/* ── Форма подключения ────────────────────────────────────────── */}
              {selectedSsid && (
                <div className="flex flex-col gap-2 rounded-xl bg-white/60 border border-white/50 px-4 py-3 shadow-sm">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide input-header">
                    Подключение к <span className="text-gray-700">{selectedSsid}</span>
                  </div>
                  <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
                    className="w-full px-3 py-2 rounded-lg bg-white/70 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#BD9673] input-header transition-colors"
                  />
                  <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white text-sm font-semibold input-header shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? "Подключение..." : "Подключиться"}
                  </button>
                </div>
              )}

              {/* ── Сообщение ────────────────────────────────────────────────── */}
              {message && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm font-medium input-header ${
                    message.ok
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
