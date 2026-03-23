import { useEffect } from 'react';

type Direction = 'up' | 'down';

export function useClicker(onPress: (direction: Direction) => void) {
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');

    ws.onopen = () => console.log('[clicker] WebSocket подключён');
    ws.onclose = () => console.log('[clicker] WebSocket отключён');
    ws.onerror = (e) => console.warn('[clicker] WebSocket ошибка', e);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'clicker') {
          onPress(data.direction);
        }
      } catch(e) {}
    };

    return () => ws.close();
  }, [onPress]);
}