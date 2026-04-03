import { io } from "socket.io-client";
import { getBackendBaseUrl } from "./client-url";

const socketUrl = getBackendBaseUrl();

export const socket = io(socketUrl, {
  reconnection: true,
  transports: ["websocket"],
});
