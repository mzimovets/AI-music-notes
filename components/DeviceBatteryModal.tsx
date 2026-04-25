"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/modal";
import { useEffect, useState, useCallback } from "react";
import type { DeviceEntry } from "@/app/api/device-battery/route";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type DeviceMap = Record<string, DeviceEntry>;

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m} ${m === 1 ? "минуту" : m < 5 ? "минуты" : "минут"} назад`;
  }
  const h = Math.floor(diff / 3600);
  return `${h} ${h === 1 ? "час" : h < 5 ? "часа" : "часов"} назад`;
}

function BatteryBar({ level }: { level: number }) {
  const color = level > 50 ? "#22c55e" : level > 30 ? "#f59e0b" : "#ef4444";
  const segments = 10;
  const filled = Math.round((level / 100) * segments);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-[2px]">
        <div
          className="flex items-center gap-[2px] rounded-md border-2 p-[3px]"
          style={{ borderColor: color }}
        >
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className="w-[6px] h-[14px] rounded-sm transition-colors duration-300"
              style={{ background: i < filled ? color : "#e5e7eb" }}
            />
          ))}
        </div>
        <div className="w-[3px] h-[8px] rounded-r-sm" style={{ background: color }} />
      </div>
      <span className="text-sm font-semibold tabular-nums w-9" style={{ color }}>
        {level}%
      </span>
    </div>
  );
}

export function DeviceBatteryModal({ isOpen, onClose }: Props) {
  const [devices, setDevices] = useState<DeviceMap>({});
  const [, setTick] = useState(0);

  // SSE — получаем обновления мгновенно как только iPhone отправляет данные
  useEffect(() => {
    if (!isOpen) return;

    const es = new EventSource("/api/device-battery/stream");
    es.onmessage = (e) => {
      try { setDevices(JSON.parse(e.data)); } catch {}
    };
    es.onerror = () => es.close();

    return () => es.close();
  }, [isOpen]);

  // Обновляем timeAgo каждые 30 сек
  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [isOpen]);

  const handleDelete = useCallback(async (deviceName: string) => {
    try {
      await fetch("/api/device-battery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceName }),
      });
      setDevices((prev) => {
        const next = { ...prev };
        delete next[deviceName];
        return next;
      });
    } catch {}
  }, []);

  const entries = Object.entries(devices).sort(([, a], [, b]) => a.battery - b.battery);
  const totalCount = entries.length;
  const lowBatteryCount = entries.filter(([, d]) => d.battery < 30).length;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      placement="center"
      backdrop="blur"
      size="sm"
    >
      <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-3 pt-5 pb-2">
              {/* Top row: icon + title + stats */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#BD9673] to-[#7D5E42] flex items-center justify-center shadow-md flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/>
                    <line x1="23" y1="13" x2="23" y2="11"/>
                    <line x1="7" y1="10" x2="7" y2="14"/>
                    <line x1="11" y1="10" x2="11" y2="14"/>
                  </svg>
                </div>

                <span className="text-lg font-bold text-gray-900 input-header flex-1">
                  Заряд устройств
                </span>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Total count */}
                  {totalCount > 0 && (
                    <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                        <line x1="12" y1="18" x2="12.01" y2="18"/>
                      </svg>
                      <span className="text-xs font-semibold text-gray-500 input-header">{totalCount}</span>
                    </div>
                  )}

                  {/* Low battery warning */}
                  {lowBatteryCount > 0 && (
                    <div className="flex items-center gap-1 bg-red-50 rounded-full px-2.5 py-1">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span className="text-xs font-semibold text-red-500 input-header">{lowBatteryCount}</span>
                    </div>
                  )}
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="pb-5">
              {entries.length === 0 ? (
                <div className="text-center py-8 text-gray-400 input-header text-sm">
                  <p>Нет данных</p>
                  <p className="mt-1 text-xs">Данные появятся когда устройства отправят заряд</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {entries.map(([name, data]) => (
                    <div
                      key={name}
                      className="flex flex-col gap-1 rounded-xl bg-white/60 border border-white/50 px-3 py-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800 input-header truncate flex-1">
                          {name}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <BatteryBar level={data.battery} />
                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(name)}
                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors flex-shrink-0"
                            aria-label="Удалить устройство"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hover:stroke-red-400">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 input-header">
                        {timeAgo(data.updatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
