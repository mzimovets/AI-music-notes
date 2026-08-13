"use client";

import { useEffect, useState } from "react";

/**
 * Экран на случай, когда приложение не смогло запуститься.
 *
 * Ловит ровно тот случай, который наблюдали вживую: приложение обновилось,
 * страница пришла из кеша, а её файлы оформления и кода — ещё нет, и связи
 * тоже нет. Раньше это давало голый текст и системное сообщение об ошибке;
 * теперь — понятный экран, который сам пытается восстановиться.
 *
 * Речь не об офлайне как таковом: приложение обязано открываться и из кеша,
 * и с платы, и из интернета. Проблема именно в неполной установке, поэтому
 * и текст об этом, а не «нет интернета».
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Как только связь появляется — перезагружаемся сами: файлы докачаются
    // с того источника, который оказался рядом, будь то плата или интернет
    const onOnline = () => window.location.reload();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const retry = () => {
    setRetrying(true);
    // Полная перезагрузка, а не reset(): дело не в состоянии приложения,
    // а в недокачанных файлах — их нужно запросить заново
    window.location.reload();
  };

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#F7F4F1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: '"Roboto Slab", Georgia, serif',
          color: "#5A4636",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/satellite.svg"
            alt=""
            width={96}
            height={96}
            style={{ opacity: 0.55, marginBottom: 24 }}
          />

          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>
            Приложение ещё не загрузилось полностью
          </h1>

          <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 8px", color: "#7D5E42" }}>
            Часть файлов не успела сохраниться на устройство, а связи сейчас нет.
          </p>

          <p style={{ fontSize: 15, lineHeight: 1.5, margin: "0 0 28px", color: "#9A8878" }}>
            Подключитесь к Wi-Fi платы или к интернету — загрузка продолжится
            сама с того места, где остановилась.
          </p>

          <button
            onClick={retry}
            disabled={retrying}
            style={{
              appearance: "none",
              border: "none",
              borderRadius: 14,
              padding: "14px 28px",
              fontSize: 16,
              fontFamily: "inherit",
              color: "#fff",
              background: "linear-gradient(to right, #BD9673, #7D5E42)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
              cursor: retrying ? "default" : "pointer",
              opacity: retrying ? 0.6 : 1,
            }}
          >
            {retrying ? "Загружаю…" : "Попробовать снова"}
          </button>
        </div>
      </body>
    </html>
  );
}
