"use client";

import { useEffect, useRef } from "react";
import { addToast } from "@heroui/react";

/**
 * Замечает, что на сервере появилась новая версия приложения.
 *
 * Next.js привязывает серверные действия и куски кода к идентификатору сборки.
 * Вкладка, открытая до выкладки, обращается к тому, чего на сервере уже нет:
 * добавление ноты молча не проходит, страницы перестают открываться. Раньше это
 * лечилось только тем, что человек догадывался перезагрузить страницу.
 */

const CHECK_INTERVAL_MS = 60_000;
/** Время последней автоперезагрузки — чтобы они не пошли по кругу */
const RELOAD_GUARD_KEY = "build-reload-at";

export function UpdateNotifier() {
  const notified = useRef(false);

  useEffect(() => {
    const current = process.env.NEXT_PUBLIC_BUILD_ID;
    if (!current) return;

    const reload = () => {
      // Защита от круга перезагрузок, если версии на сервере разъедутся
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
      if (Date.now() - last < 5 * 60_000) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
      window.location.reload();
    };

    const announce = () => {
      if (notified.current) return;
      notified.current = true;

      // Приложение не смотрят — обновляемся молча, чтобы человек вернулся уже
      // на новую версию. Перезагружать под руками нельзя: регент может править
      // программу, а певчие — смотреть ноты на службе
      if (document.visibilityState === "hidden") {
        reload();
        return;
      }

      // Открыто и в работе — предлагаем, а как отложат, обновимся сами
      document.addEventListener("visibilitychange", function onHide() {
        if (document.visibilityState !== "hidden") return;
        document.removeEventListener("visibilitychange", onHide);
        reload();
      });

      addToast({
        title: <span className="font-bold text-white">Вышло обновление</span>,
        description: (
          <span
            className="text-white cursor-pointer underline underline-offset-4"
            onClick={() => window.location.reload()}
          >
            Нажмите, чтобы обновить приложение
          </span>
        ),
        timeout: 0,
        classNames: {
          base: "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white",
        },
      });
    };

    const check = async () => {
      if (notified.current) return;
      try {
        const res = await fetch("/api/build-id", { cache: "no-store" });
        if (!res.ok) return;
        const { buildId } = await res.json();
        if (buildId && buildId !== current) announce();
      } catch {
        // Офлайн — это нормально, просто ждём следующей проверки
      }
    };

    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Страховка: если действие уже сорвалось, вкладка нерабочая — перезагружаем
    // сами, один раз за сеанс, чтобы не попасть в круг перезагрузок
    const onStaleAction = (message?: string) => {
      if (!message?.includes("Failed to find Server Action")) return;
      reload();
    };

    const onError = (e: ErrorEvent) => onStaleAction(e.message);
    const onRejection = (e: PromiseRejectionEvent) =>
      onStaleAction(
        typeof e.reason === "string" ? e.reason : e.reason?.message,
      );

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
