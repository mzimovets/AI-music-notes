// Кастомный Next.js-сервер: WebSocket-прокси /ws-clicker на порту 3000
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocket, WebSocketServer } = require("ws");

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
      const upstreamHeaders = {};
      if (req.headers["x-clicker-sender"]) {
        upstreamHeaders["x-clicker-sender"] = req.headers["x-clicker-sender"];
      }
      const upstream = new WebSocket("ws://localhost:4000/ws-clicker", { headers: upstreamHeaders });

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
