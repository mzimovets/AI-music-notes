import { useEffect } from 'react';
import { getClickerWebSocketUrl } from "@/lib/client-url";

type Direction = 'up' | 'down' | 'middle';

export function useClicker(onPress: (direction: Direction) => void) {
  useEffect(() => {
    const ws = new WebSocket(getClickerWebSocketUrl());

    ws.onopen = () => console.log('[clicker] WebSocket подключён');
    ws.onclose = () => console.log('[clicker] WebSocket отключён');
    ws.onerror = (e) => console.warn('[clicker] WebSocket ошибка', e);

    ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'clicker') {
            if (data.direction === 'middle') {
              // Кидаем кастомное событие на window
              window.dispatchEvent(new CustomEvent('clicker:middle'));
            } else {
              onPress(data.direction);
            }
          }
        } catch(e) {}
      };

    return () => ws.close();
  }, [onPress]);
}
