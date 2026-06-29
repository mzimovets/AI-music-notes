// Кастомный Next.js-сервер: добавляет WebSocket-прокси для кликера
// на том же порту 3000 (SSL терминируется снаружи контейнера)
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocket, WebSocketServer } from "ws";

const port = parseInt(process.env.PORT_NEXT || "3000", 10);

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/ws-clicker") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (client) => {
      const upstream = new WebSocket("ws://localhost:4000/ws-clicker");

      upstream.on("open", () => {
        client.on("message", (data) => {
          if (upstream.readyState === WebSocket.OPEN) upstream.send(data);
        });
        upstream.on("message", (data) => {
          if (client.readyState === WebSocket.OPEN) client.send(data);
        });
      });

      const cleanup = () => {
        try { client.close(); } catch (_) {}
        try { upstream.close(); } catch (_) {}
      };
      client.on("close", cleanup);
      upstream.on("close", cleanup);
      upstream.on("error", cleanup);
      client.on("error", cleanup);
    });
  });

  server.listen(port, () => {
    console.log(`> Next.js + /ws-clicker proxy on port ${port}`);
  });
});
