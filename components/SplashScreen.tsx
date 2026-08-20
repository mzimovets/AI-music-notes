"use client";
import { useEffect, useState } from "react";

/** Пометка, по которой заставку показывают намеренно — см. ниже */
export const SPLASH_FORCE_KEY = "splashOnNextLoad";

/**
 * Заставка при холодном запуске установленного приложения.
 *
 * Показывается один раз за запуск, а не при каждой загрузке документа. Разница
 * важна без связи: там переходы между разделами не проходят внутри приложения
 * и превращаются в полную перезагрузку страницы — заставка выскакивала на
 * каждый переход, будто приложение открывается заново.
 *
 * Отличить запуск от такой перезагрузки помогает sessionStorage: он переживает
 * перезагрузку, но очищается, когда приложение закрывают совсем. Плюс пометка
 * для случаев, когда заставка нужна намеренно, — при переключении между платой
 * и интернетом приложение перезагружает себя само, и это стоит показать.
 *
 * Видимость задана в CSS через display-mode: в обычной вкладке браузера
 * заставка иначе успевала мелькнуть до того, как отработает скрипт.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "fading" | "done">(() => {
    if (typeof window === "undefined") return "visible";
    try {
      if (sessionStorage.getItem(SPLASH_FORCE_KEY) === "1") return "visible";
      // Уже показывали в этом запуске — значит это переход, а не открытие
      return sessionStorage.getItem("splashShown") === "1" ? "done" : "visible";
    } catch {
      return "visible";
    }
  });

  useEffect(() => {
    if (phase === "done") return;

    try {
      sessionStorage.setItem("splashShown", "1");
      sessionStorage.removeItem(SPLASH_FORCE_KEY);
    } catch {}

    const fade = setTimeout(() => setPhase("fading"), 1500);
    const done = setTimeout(() => setPhase("done"), 1900);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "done") return null;

  return (
    <div className={`splash${phase === "fading" ? " splash-hide" : ""}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo512.png" alt="" className="splash-icon" width={112} height={112} />
    </div>
  );
}
