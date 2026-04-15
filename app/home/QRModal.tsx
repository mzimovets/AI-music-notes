"use client";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";
import { getBackendBaseUrl } from "@/lib/client-url";
import { AnimatePresence, motion } from "framer-motion";

export const QRModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [qrUrl, setQrUrl] = useState("");
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const tokenRef = useRef("");

  useEffect(() => {
    if (!isOpen) {
      setQrUrl("");
      setOtp("");
      setVerified(false);
      tokenRef.current = "";
      return;
    }

    const backUrl = getBackendBaseUrl();

    const handleVerified = ({ token }: { token: string }) => {
      if (token === tokenRef.current) {
        setVerified(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    };

    socket.on("qr-verified", handleVerified);

    fetch(`${backUrl}/auth/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socketId: socket.id }),
    })
      .then((r) => r.json())
      .then((data) => {
        tokenRef.current = data.token;
        setOtp(data.otp);
        const frontendBase = `http://${data.localIP}:${window.location.port || 3000}`;
        setQrUrl(`${frontendBase}/authPage?qr=${data.token}`);
      });

    return () => {
      socket.off("qr-verified", handleVerified);
    };
  }, [isOpen, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="center"
      backdrop="blur"
      classNames={{ backdrop: "bg-black/40" }}
    >
      <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl">
        <ModalHeader className="flex flex-col items-center pt-6 pb-0 text-center gap-1">
          <h3 className="font-pheader text-2xl">Вход по QR-коду</h3>
          <AnimatePresence mode="wait">
            {!verified && (
              <motion.p
                key="subtitle"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="input-header text-sm text-gray-500 font-normal"
              >
                Отсканируйте QR-код и введите код ниже на устройстве
              </motion.p>
            )}
          </AnimatePresence>
        </ModalHeader>
        <ModalBody className="flex flex-col items-center gap-5 pb-7 pt-4">
          <AnimatePresence mode="wait">
            {!verified ? (
              <motion.div
                key="qr-code"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white p-3 rounded-2xl shadow-md"
              >
                {qrUrl ? (
                  <div className="overflow-hidden rounded-lg" style={{ filter: 'drop-shadow(0 0 0.75px rgba(0,0,0,0.1))' }}>
                    <QRCodeSVG
                      value={qrUrl}
                      size={200}
                      bgColor="white"
                      fgColor="#3D2817"
                      level="L"
                      includeMargin={false}
                      quietZone={0}
                    />
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] bg-gray-100 rounded-xl animate-pulse" />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="checkmark"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative w-24 h-24"
                style={{
                  animation: "scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-12 h-12 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                      strokeDasharray="24"
                      strokeDashoffset="24"
                      style={{
                        animation: "dash 0.5s ease-out 0.3s forwards",
                      }}
                    />
                  </svg>
                </div>
                <style>{`
                  @keyframes scaleIn {
                    from {
                      opacity: 0;
                      transform: scale(0.3);
                    }
                    to {
                      opacity: 1;
                      transform: scale(1);
                    }
                  }
                  @keyframes dash {
                    to {
                      stroke-dashoffset: 0;
                    }
                  }
                `}</style>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!verified ? (
              <motion.div
                key="otp-digits"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex gap-2"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-10 h-12 flex items-center justify-center rounded-xl border-2 border-[#BD9673] bg-white font-pheader text-xl text-[#7D5E42]"
                  >
                    {otp[i] || ""}
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.p
                key="success-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="font-pheader text-sm text-gray-800"
              >
                Успешный вход
              </motion.p>
            )}
          </AnimatePresence>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
