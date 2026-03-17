"use client";
import React, { useEffect, useState } from "react";
import { Form, Input, Button, Card } from "@heroui/react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { EyeFilledIcon } from "./components/EyeFilledIcon";
import { EyeSlashFilledIcon } from "./components/EyeSlashFilledIcon";

import { Pattern } from "@/components/pattern";

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const toggleVisibility = () => setShowPassword((prev) => !prev);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="h-screen flex items-center justify-center px-4 sm:px-6">
      <Card className="p-8 w-full max-w-md sm:max-w-lg md:max-w-xl shadow-lg md:shadow-2xl bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50">
        <div className="absolute top-0 left-0 pt-2 pl-2 z-0 pointer-events-none">
          <Pattern className="opacity-80" height={120} width={124} />
        </div>

        <div className="font-bold text-center pb-4 font-pheader">
          Авторизация
        </div>
        <Form
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
            className="input-header w-full max-w-sm"
            errorMessage="Пожалуйста, введите логин"
            label="Логин"
            labelPlacement="outside"
            name="username"
            placeholder="Введите логин"
            type="text"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("login-submit")?.click();
              }
            }}
          />

          <Input
            isRequired
            className="input-header w-full max-w-sm"
            // classNames={{ endContent: "pointer-events-auto" }}
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
            errorMessage="Пожалуйста, введите пароль"
            id="password"
            label="Пароль"
            labelPlacement="outside"
            name="password"
            placeholder="Введите пароль"
            type={showPassword ? "text" : "password"}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("login-submit")?.click();
              }
            }}
          />

          {errorMessage && (
            <div className="w-full flex justify-center max-w-sm">
              <p className="input-header text-sm text-danger text-center">
                {errorMessage}
              </p>
            </div>
          )}

          <div className="w-full mt-4 flex justify-center">
            <Button
              className="input-header px-10 py-2 rounded-lg bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white font-medium hover:opacity-90 transition-all"
              id="login-submit"
              isLoading={isLoading}
              type="submit"
            >
              Войти
            </Button>
          </div>
        </Form>
        <div className="absolute bottom-3 right-2 z-0 pointer-events-none">
          <Pattern
            className="scale-y-[-1] scale-x-[-1] opacity-80"
            height={120}
            width={124}
          />
        </div>
      </Card>
    </div>
  );
}
