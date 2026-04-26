"use client";

import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import { useRef, useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface WifiData {
  ssid: string;
  password: string;
}

function parseWifiQR(raw: string): WifiData | null {
  if (!raw.startsWith("WIFI:")) return null;
  const get = (key: string) => {
    const match = raw.match(new RegExp(`(?:^|;)${key}:([^;]*)`));
    return match ? match[1].replace(/\\(.)/g, "$1") : "";
  };
  const ssid = get("S");
  if (!ssid) return null;
  return { ssid, password: get("P") };
}

export function WiFiScannerModal({ isOpen, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [wifi, setWifi] = useState<WifiData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) { setWifi(null); setCopied(false); }
  }, [isOpen]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((res) => { img.onload = res; });

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const jsQR = (await import("jsqr")).default;
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      const parsed = parseWifiQR(code.data);
      if (parsed) { setWifi(parsed); return; }
    }
    // QR не распознан — сбрасываем input чтобы можно было попробовать снова
    e.target.value = "";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(wifi?.password ?? "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
              <span className="text-lg font-bold text-gray-900 input-header">Подключиться к Wi-Fi</span>
            </ModalHeader>

            <ModalBody className="pb-6">
              {!wifi ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  {/* Скрытый input — открывает камеру на iOS без HTTPS */}
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFile}
                  />

                  {/* Большая кнопка-камера */}
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="w-48 h-48 rounded-2xl bg-gradient-to-br from-[#BD9673]/10 to-[#7D5E42]/10 border-2 border-dashed border-[#BD9673]/40 flex flex-col items-center justify-center gap-3 hover:border-[#BD9673] transition-colors"
                  >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#BD9673" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span className="text-sm text-[#7D5E42] input-header font-medium">Открыть камеру</span>
                  </button>

                  <p className="text-xs text-gray-400 input-header text-center">
                    Сфотографируйте QR код регента
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>

                  <div className="w-full flex flex-col gap-2">
                    <div className="rounded-xl bg-white/60 border border-white/50 px-4 py-3">
                      <p className="text-xs text-gray-400 input-header mb-0.5">Сеть</p>
                      <p className="text-sm font-semibold text-gray-800 input-header">{wifi.ssid}</p>
                    </div>
                    {wifi.password && (
                      <div className="rounded-xl bg-white/60 border border-white/50 px-4 py-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 input-header mb-0.5">Пароль</p>
                          <p className="text-sm font-semibold text-gray-800 input-header break-all">{wifi.password}</p>
                        </div>
                        <button
                          onClick={handleCopy}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white text-xs input-header"
                        >
                          {copied ? "✓" : "Копировать"}
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 input-header text-center">
                    Настройки → Wi-Fi → выберите сеть → введите пароль
                  </p>

                  <button
                    onClick={() => { setWifi(null); if (inputRef.current) inputRef.current.value = ""; }}
                    className="text-xs text-[#BD9673] input-header hover:text-[#7D5E42] transition-colors"
                  >
                    Сканировать снова
                  </button>
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
