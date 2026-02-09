"use client";
import React, { useEffect, useState } from "react";
import { Form, Input, Button, Card } from "@heroui/react";
import { useRouter } from "next/navigation";

export default function Page() {
  const [action, setAction] = React.useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Блокировка скролла body только на этой странице
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // отключаем прокрутку
    return () => {
      document.body.style.overflow = originalOverflow; // возвращаем при уходе со страницы
    };
  }, []);

  return (
    <div className="h-screen flex items-center justify-center px-4 sm:px-6">
      <Card className="p-6 input-header w-full max-w-full sm:max-w-sm shadow-lg md:shadow-2xl bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50">
        <div className="font-bold text-center pb-4">Авторизация</div>
        <Form
          className="w-full max-w-xs flex flex-col gap-4"
          onReset={() => setAction("reset")}
          onSubmit={async (e) => {
            e.preventDefault();
            setIsLoading(true);
            let data = Object.fromEntries(new FormData(e.currentTarget));
            setAction(`submit ${JSON.stringify(data)}`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            router.push("/");
          }}
        >
          <Input
            isRequired
            errorMessage="Пожалуйста, введите логин"
            label="Логин"
            labelPlacement="outside"
            name="username"
            placeholder="Введите логин"
            type="text"
          />

          <Input
            isRequired
            errorMessage="Пожалуйста, введите пароль"
            label="Пароль"
            labelPlacement="outside"
            name="password"
            placeholder="Введите пароль"
            type="text"
          />
          <div className="flex w-full justify-center mt-4">
            <Button
              type="submit"
              isLoading={isLoading}
              className="px-8 py-2 rounded-lg bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white font-medium hover:opacity-90 transition-all"
            >
              Войти
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
