import { io } from "socket.io-client";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const getSocketUrl = () => {
  if (typeof window === "undefined") return "http://localhost:4000";
  // В локальном окружении — напрямую к Express (порт 4000, нет SSL)
  if (LOCAL_HOSTS.has(window.location.hostname)) return "http://localhost:4000";
  // В продакшне — через тот же origin (SSL завершается снаружи, порт 443 → 3000)
  return window.location.origin;
};

export const socket = io(getSocketUrl(), {
  reconnection: true,
  transports: ["websocket"],
});
