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

    const handle = (raw: string) => {
      try {
        const data = JSON.parse(raw);
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

    ws.onmessage = (event) => {
      // На проде между сервером и браузером что-то заворачивает текстовые
      // кадры в бинарные (Blob) — сам сервер шлёт обычный текст
      // (ws.send(JSON.stringify(...))), но до браузера долетает Blob.
      // Doступа поправить это на уровне инфраструктуры сейчас нет, поэтому
      // принимаем оба варианта здесь
      if (event.data instanceof Blob) {
        event.data.text().then(handle);
      } else {
        handle(event.data);
      }
    };

    return () => { ws.close(); setIsConnected(false); };
  }, [onPress]);

  return { isConnected };
}
