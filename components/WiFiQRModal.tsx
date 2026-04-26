"use client";

import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import type { WifiCredentials } from "@/app/api/wifi-credentials/route";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function escapeWifi(str: string) {
  return str.replace(/([\\;,"])/g, "\\$1");
}

function buildWifiString(creds: WifiCredentials) {
  return `WIFI:T:WPA;S:${escapeWifi(creds.ssid)};P:${escapeWifi(creds.password)};;`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

  const p = (n: number, one: string, few: string, many: string) => {
    const m10 = n % 10, m100 = n % 100;
    if (m100 >= 11 && m100 <= 14) return `${n} ${many}`;
    if (m10 === 1) return `${n} ${one}`;
    if (m10 >= 2 && m10 <= 4) return `${n} ${few}`;
    return `${n} ${many}`;
  };

  if (diff < 60) return "только что";
  if (diff < 3600)        return p(Math.floor(diff / 60),           "минуту",  "минуты",  "минут")   + " назад";
  if (diff < 86400)       return p(Math.floor(diff / 3600),         "час",     "часа",    "часов")   + " назад";
  if (diff < 7 * 86400)   return p(Math.floor(diff / 86400),        "день",    "дня",     "дней")    + " назад";
  if (diff < 21 * 86400)  return p(Math.floor(diff / (7 * 86400)),  "неделю",  "недели",  "недель")  + " назад";
  if (diff < 365 * 86400) return p(Math.round(diff / (30 * 86400)), "месяц",   "месяца",  "месяцев") + " назад";
  return p(Math.floor(diff / (365 * 86400)), "год", "года", "лет") + " назад";
}

export function WiFiQRModal({ isOpen, onClose }: Props) {
  const [creds, setCreds] = useState<WifiCredentials | null>(null);

  // SSE — получаем обновления мгновенно когда iPhone подключается к Wi-Fi
  useEffect(() => {
    if (!isOpen) return;

    const es = new EventSource("/api/wifi-credentials/stream");
    es.onmessage = (e) => {
      try { setCreds(JSON.parse(e.data)); } catch {}
    };
    es.onerror = () => es.close();

    return () => es.close();
  }, [isOpen]);

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
            <ModalHeader className="flex items-center gap-3 pt-5 pb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#BD9673] to-[#7D5E42] flex items-center justify-center shadow-md flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                  <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                  <circle cx="12" cy="20" r="1" fill="white" stroke="none"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 input-header">Wi-Fi QR код</span>
            </ModalHeader>

            <ModalBody className="pb-6 flex flex-col items-center gap-4">
              {!creds ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                      <circle cx="12" cy="20" r="1" fill="#9ca3af" stroke="none"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 input-header">Ожидание подключения</p>
                    <p className="text-xs text-gray-400 input-header mt-1">
                      QR появится автоматически когда устройство подключится к Wi-Fi
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white p-3 rounded-2xl shadow-md">
                    <QRCodeSVG
                      value={buildWifiString(creds)}
                      size={220}
                      bgColor="white"
                      fgColor="#3D2817"
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800 input-header">{creds.ssid}</p>
                    <p className="text-xs text-gray-400 input-header mt-0.5">
                      Обновлено {timeAgo(creds.updatedAt)}
                    </p>
                  </div>

                </>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
