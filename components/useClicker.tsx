import { useEffect, useState } from "react";
import { getClickerWebSocketUrl } from "@/lib/client-url";

type Direction = "up" | "down" | "middle";

export function useClicker(onPress: (direction: Direction) => void): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(getClickerWebSocketUrl());

    ws.onopen    = () => console.log("[clicker] WebSocket подключён, ожидаем статус...");
    ws.onclose   = () => { console.log("[clicker] WebSocket отключён"); setIsConnected(false); };
    ws.onerror   = (e) => { console.warn("[clicker] WebSocket ошибка:", e); setIsConnected(false); };

    ws.onmessage = (event) => {
      try {
        console.log("[clicker] получено сообщение:", event.data);
        const data = JSON.parse(event.data);
        if (data.type === "clicker-connected") {
          console.log("[clicker] статус устройства:", data.connected);
          setIsConnected(data.connected);
        } else if (data.type === "clicker") {
          if (data.direction === "middle") {
            window.dispatchEvent(new CustomEvent("clicker:middle"));
          } else {
            onPress(data.direction);
          }
        }
      } catch (e) {}
    };

    return () => { ws.close(); setIsConnected(false); };
  }, [onPress]);

  return { isConnected };
}
