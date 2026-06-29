// Кастомный Next.js-сервер: проксирует /ws-clicker и /socket.io/ на Express (port 4000)
const { createServer } = require("http");
const { parse } = require("url");
const net = require("net");
const next = require("next");
const { WebSocket, WebSocketServer } = require("ws");

const port = parseInt(process.env.PORT_NEXT || "3000", 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // Проксируем socket.io HTTP-polling на Express
    if (req.url?.startsWith("/socket.io")) {
      const proxy = require("http").request(
        {
          hostname: "localhost",
          port: 4000,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: "localhost:4000" },
        },
        (pRes) => {
          res.writeHead(pRes.statusCode, pRes.headers);
          pRes.pipe(res, { end: true });
        }
      );
      req.pipe(proxy, { end: true });
      proxy.on("error", () => { res.writeHead(502); res.end(); });
      return;
    }
    handle(req, res, parse(req.url, true));
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = req.url || "";

    // Проксируем socket.io WebSocket на Express через TCP-туннель
    if (url.startsWith("/socket.io")) {
      const proxySocket = net.createConnection(4000, "localhost", () => {
        let rawReq = `${req.method} ${url} HTTP/1.1\r\n`;
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
          rawReq += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
        }
        rawReq += "\r\n";
        proxySocket.write(rawReq);
        if (head?.length) proxySocket.write(head);
        socket.pipe(proxySocket);
        proxySocket.pipe(socket);
      });
      proxySocket.on("error", () => { try { socket.destroy(); } catch (_) {} });
      socket.on("error", () => { try { proxySocket.destroy(); } catch (_) {} });
      return;
    }

    // Проксируем /ws-clicker на Express
    if (url !== "/ws-clicker") {
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
    console.log(`> Next.js + /socket.io + /ws-clicker proxy on port ${port}`);
  });
});
