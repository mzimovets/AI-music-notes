"use client";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useLocalServer } from "@/hooks/useLocalServer";

export function NotificationBell() {
  const { rpiBaseUrl } = useLocalServer();
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe } =
    usePushSubscription(rpiBaseUrl);

  if (!isSupported || isSubscribed) return null;

  const handleClick = () => {
    if (isSubscribed) unsubscribe();
    else subscribe();
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={isSubscribed ? "Отключить уведомления" : "Включить уведомления о новых программах"}
      style={{
        position: "relative",
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: `1.5px solid ${isSubscribed ? "#BD9673" : "#e5e7eb"}`,
        background: isSubscribed ? "#FFF5EB" : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      {/* Bell icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isSubscribed ? "#BD9673" : "#9ca3af"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        {!isSubscribed && (
          <line x1="1" y1="1" x2="23" y2="23" stroke="#d1d5db" strokeWidth="1.5" />
        )}
      </svg>

      {/* Красная точка — только если НЕ подписан */}
      {!isSubscribed && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#ef4444",
            border: "1.5px solid #fff",
          }}
        />
      )}
    </button>
  );
}
