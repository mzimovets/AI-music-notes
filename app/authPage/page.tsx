"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { EyeFilledIcon } from "./components/EyeFilledIcon";
import { EyeSlashFilledIcon } from "./components/EyeSlashFilledIcon";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Pattern } from "@/components/pattern";

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // QR login state
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrOtp, setQrOtp] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");

  const toggleVisibility = () => setShowPassword((prev) => !prev);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const params = new URLSearchParams(window.location.search);
    const qr = params.get("qr");
    if (qr) setQrToken(qr);

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleQrLogin = async () => {
    if (qrOtp.length !== 6 || !qrToken) return;
    setQrLoading(true);
    setQrError("");
    const result = await signIn("qr", {
      token: qrToken,
      otp: qrOtp,
      redirect: false,
    });
    if (!result?.ok) {
      setQrLoading(false);
      setQrError("Неверный код или QR-код истёк");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center px-4 sm:px-6">
      {/* QR OTP Modal */}
      <Modal
        isOpen={!!qrToken}
        placement="center"
        backdrop="blur"
        isDismissable={!qrLoading}
        onOpenChange={(open) => {
          if (!open) {
            setQrToken(null);
            setQrOtp("");
            setQrError("");
          }
        }}
        classNames={{ backdrop: "bg-black/40" }}
      >
        <ModalContent className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.25)] rounded-2xl">
          <ModalHeader className="flex items-center justify-between pt-6 pb-0">
            <h3 className="font-pheader text-2xl flex-1 text-center">
              Введите код
            </h3>
          </ModalHeader>
          <ModalBody className="flex flex-col items-center gap-6 pb-7 pt-4">
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={qrOtp[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d?$/.test(val)) {
                      const newOtp = qrOtp.split("");
                      newOtp[i] = val;
                      const otpStr = newOtp.join("");
                      setQrOtp(otpStr);
                      setQrError("");
                      if (val && i < 5) {
                        const nextInput = document.querySelector(
                          `input[data-index="${i + 1}"]`,
                        ) as HTMLInputElement;
                        nextInput?.focus();
                      } else if (otpStr.length === 6) {
                        handleQrLogin();
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace") {
                      e.preventDefault();
                      const newOtp = qrOtp.split("");
                      if (qrOtp[i]) {
                        newOtp[i] = "";
                      } else if (i > 0) {
                        newOtp[i - 1] = "";
                        const prevInput = document.querySelector(
                          `input[data-index="${i - 1}"]`,
                        ) as HTMLInputElement;
                        prevInput?.focus();
                      }
                      setQrOtp(newOtp.join(""));
                      setQrError("");
                    }
                  }}
                  disabled={qrLoading}
                  data-index={i}
                  className="w-10 h-12 flex items-center justify-center rounded-xl border-2 border-[#BD9673] bg-white font-pheader text-xl text-[#7D5E42] text-center disabled:opacity-50"
                />
              ))}
            </div>

            {qrError && (
              <p className="input-header text-sm text-danger text-center">
                {qrError}
              </p>
            )}

            <Button
              onPress={handleQrLogin}
              isLoading={qrLoading}
              isDisabled={qrOtp.length !== 6}
              className="input-header px-10 py-2 rounded-lg bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white font-medium hover:opacity-90 transition-all"
            >
              {qrLoading ? "" : "Войти"}
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
      <Card className="p-8 w-full max-w-md sm:max-w-lg md:max-w-xl shadow-lg md:shadow-2xl bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50">
        <div className="absolute top-0 left-0 pt-2 pl-2 z-0 pointer-events-none">
          <Pattern width={124} height={120} className="opacity-80" />
        </div>

        <div className="font-bold text-center pb-4 font-pheader">
          Авторизация
        </div>
        <Form
          ref={formRef}
          className="w-full flex flex-col gap-4 items-center"
          onSubmit={async (e) => {
            e.preventDefault();
            setIsLoading(true);
            setErrorMessage("");

            const formData = new FormData(e.currentTarget);
            const username = String(formData.get("username") ?? "").trim();
            const password = String(formData.get("password") ?? "").trim();

            if (!username || !password) {
              setIsLoading(false);
              return;
            }

            const result = await signIn("credentials", {
              username,
              password,
              redirect: false,
            });

            setIsLoading(false);

            if (!result?.ok) {
              setErrorMessage("Неверный логин или пароль");
            } else {
              setErrorMessage("");
              router.push("/");
            }
          }}
        >
          <Input
            isClearable
            isRequired
            label="Логин"
            labelPlacement="outside"
            name="username"
            placeholder="Введите логин"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            errorMessage="Пожалуйста, введите логин"
            className="input-header w-full max-w-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />

          <Input
            isRequired
            id="password"
            name="password"
            label="Пароль"
            placeholder="Введите пароль"
            type={showPassword ? "text" : "password"}
            autoCapitalize="none"
            autoCorrect="off"
            errorMessage="Пожалуйста, введите пароль"
            className="input-header w-full max-w-sm"
            labelPlacement="outside"
            classNames={{ endContent: "pointer-events-auto" }}
            endContent={
              <button
                aria-label="toggle password visibility"
                className="focus:outline-none"
                type="button"
                onClick={toggleVisibility}
              >
                {showPassword ? (
                  <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                ) : (
                  <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                )}
              </button>
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />

          {errorMessage && (
            <div className="w-full flex justify-center max-w-sm mb-2">
              <p className="input-header text-sm text-danger text-center flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {errorMessage}
              </p>
            </div>
          )}

          <Button
            type="submit"
            isLoading={isLoading}
            className="input-header mt-2 px-10 py-2 rounded-lg bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white font-medium hover:opacity-90 transition-all"
          >
            {isLoading ? "" : "Войти"}
          </Button>
        </Form>
        <div className="absolute bottom-3 right-2 z-0 pointer-events-none">
          <Pattern
            width={124}
            height={120}
            className="scale-y-[-1] scale-x-[-1] opacity-80"
          />
        </div>
      </Card>
    </div>
  );
}
