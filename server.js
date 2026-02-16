const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Socket.IO сервер для всех клиентов
const io = new Server(server, { cors: { origin: "*" } });

// История сообщений (в памяти, до 6 часов)
let messages = [];

io.on("connection", (socket) => {
  console.log("New client connected");

  // Отправляем историю подключившемуся
  messages.forEach((msg) => socket.emit("chat message", msg));

  // Обработка нового сообщения
  socket.on("chat message", (msg) => {
    if (!msg.timestamp) msg.timestamp = new Date().toISOString();
    messages.push(msg);

    // Удаляем старые сообщения старше 6 часов
    const now = Date.now();
    messages = messages.filter(
      (m) => new Date(m.timestamp).getTime() >= now - 6 * 60 * 60 * 1000,
    );

    // Рассылаем всем клиентам
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => console.log("Client disconnected"));

  socket.on("error", (err) => console.error("Socket error:", err));
});

server.listen(3001, () =>
  console.log("Socket.IO server running on http://localhost:3001"),
);
