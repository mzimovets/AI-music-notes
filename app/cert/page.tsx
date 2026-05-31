// Страница установки CA-сертификата. Доступна только на плате (IS_LOCAL_SERVER=true).
// Адрес: https://raspberrypi-songs.local/cert-setup

import { redirect } from "next/navigation";

export default function CertSetupPage() {
  if (process.env.IS_LOCAL_SERVER !== "true") {
    redirect("/");
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "#fafaf9",
        fontFamily: "Roboto Slab, serif",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#fff",
          borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1a1a1a" }}>
            Установка сертификата
          </h1>
          <p style={{ color: "#666", fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
            Нужно сделать один раз, чтобы приложение на планшете
            видело эту плату без предупреждений
          </p>
        </div>

        {/* Download button */}
        <a
          href="/cert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "14px 20px",
            background: "rgba(22, 163, 74, 0.10)",
            border: "1.5px solid rgba(22, 163, 74, 0.35)",
            borderRadius: 12,
            color: "#15803d",
            fontWeight: 600,
            fontSize: 16,
            textDecoration: "none",
            marginBottom: 28,
            boxSizing: "border-box",
          }}
        >
          <span>⬇️</span>
          <span>Скачать сертификат</span>
        </a>

        {/* Instructions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Step
            icon="🍎"
            title="iPhone / iPad"
            steps={[
              "Нажать «Скачать сертификат» выше",
              "Настройки → Основные → VPN и управление устройством",
              "Найти «Nevsky Songs CA» → Установить",
              "Настройки → Основные → Доверие сертификатам → включить",
            ]}
          />
          <Step
            icon="🤖"
            title="Android"
            steps={[
              "Нажать «Скачать сертификат» выше",
              "Настройки → Безопасность → Дополнительно",
              "Установить сертификат → CA-сертификат",
              "Выбрать скачанный файл nevsky-songs-ca.crt",
            ]}
          />
          <Step
            icon="💻"
            title="Mac / Windows"
            steps={[
              "Нажать «Скачать сертификат» выше",
              "Двойной клик по файлу nevsky-songs-ca.crt",
              "Mac: Связка ключей → выбрать «Всегда доверять»",
              "Windows: Установить → Доверенные корневые центры",
            ]}
          />
        </div>

        <p
          style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 13,
            color: "#999",
          }}
        >
          После установки перезапустите браузер и откройте{" "}
          <a
            href="/"
            style={{ color: "#4338ca", textDecoration: "none" }}
          >
            https://raspberrypi-songs.local
          </a>
        </p>
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  steps,
}: {
  icon: string;
  title: string;
  steps: string[];
}) {
  return (
    <div
      style={{
        background: "#f9f9f8",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 15,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <ol style={{ margin: 0, paddingLeft: 18, color: "#555", fontSize: 13, lineHeight: 1.8 }}>
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
