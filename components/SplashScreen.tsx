"use client";
import { useEffect, useState } from "react";

/**
 * Заставка при холодном запуске установленного приложения.
 *
 * Монтируется один раз за загрузку документа, поэтому при переходах между
 * разделами не появляется. Видимость задана в CSS через display-mode, а не
 * здесь: в обычной вкладке браузера заставка иначе успевала мелькнуть до того,
 * как отработает скрипт.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "fading" | "done">("visible");

  useEffect(() => {
    const fade = setTimeout(() => setPhase("fading"), 1500);
    const done = setTimeout(() => setPhase("done"), 1900);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div className={`splash${phase === "fading" ? " splash-hide" : ""}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo512.png" alt="" className="splash-icon" width={112} height={112} />
    </div>
  );
}
