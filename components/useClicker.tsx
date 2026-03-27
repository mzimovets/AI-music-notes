import { useEffect } from "react";

type Direction = "up" | "down" | "middle";

// Глобальное хранилище статуса кликера
if (typeof window !== "undefined" && !(window as any).clickerStatus) {
  (window as any).clickerStatus = { connected: false };
}

export function useClicker(onPress: (direction: Direction) => void) {
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001");

    ws.onopen = () => console.log("[clicker] WebSocket подключён");

    ws.onclose = () => {
      console.log("[clicker] WebSocket отключён");
      (window as any).clickerStatus.connected = false;
      window.dispatchEvent(
        new CustomEvent("clicker:connected", { detail: { connected: false } }),
      );
    };

    ws.onerror = (e) => {
      console.warn("[clicker] WebSocket ошибка", e);
      (window as any).clickerStatus.connected = false;
      window.dispatchEvent(
        new CustomEvent("clicker:connected", { detail: { connected: false } }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "clicker") {
          if (data.direction === "middle") {
            // Кидаем кастомное событие на window
            window.dispatchEvent(new CustomEvent("clicker:middle"));
          } else {
            onPress(data.direction);
          }
        } else if (data.type === "clicker-connected") {
          // Обновляем глобальный статус
          console.log("[clicker] Received connection status:", data.connected);
          (window as any).clickerStatus.connected = data.connected;
          // Отправляем событие о подключении кликера
          window.dispatchEvent(
            new CustomEvent("clicker:connected", {
              detail: { connected: data.connected },
            }),
          );
        }
      } catch (e) {}
    };

    return () => ws.close();
  }, [onPress]);
}
