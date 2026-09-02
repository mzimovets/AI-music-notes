// Чинит nedb на версиях Node, где нет util.isDate/isArray/isRegExp — без
// этого падает вообще любое обращение к базе (см. nedb-compat.js)
import "./nedb-compat.js";

import express from "express";
const app = express();
import bodyParser from "body-parser";
import fs, { stat } from "fs";
import { createServer } from "http";
import { networkInterfaces } from "os";

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}
import { songsRoutes } from "./routes/songs.js";
import { stacksRoutes } from "./routes/stacks.js";
import { usersRoutes } from "./routes/users.js";
import { syncRoutes } from "./routes/sync.js";
import { recommendRoutes } from "./routes/recommend.js";
import { analyzeRoutes } from "./routes/analyze.js";
import { categoriesRoutes } from "./routes/categories.js";
import { startSyncScheduler } from "./sync-client.js";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath as _ftu } from "url";
import { dirname as _dirname, join as _join } from "path";
const __envDir = _dirname(_ftu(import.meta.url));
dotenv.config({ path: _join(__envDir, ".env.local"), override: true });

// ── Auto-setup nginx + mDNS при первом старте на Linux ──────────────────────
if (process.platform === "linux" && process.env.IS_LOCAL_SERVER === "true") {
  (async () => {
    const run = (cmd) => { try { execSync(cmd, { stdio: "ignore" }); return true; } catch { return false; } };
    const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

    // 1. Avahi (mDNS) — обычно уже стоит в RPi OS
    if (!exists("/etc/avahi/avahi-daemon.conf")) {
      console.log("[setup] Устанавливаю avahi-daemon...");
      run("apt-get install -y avahi-daemon");
    }
    run("systemctl enable avahi-daemon 2>/dev/null");
    run("systemctl start avahi-daemon 2>/dev/null");

    // 2. Nginx — проксирует порт 80 → 3000
    const nginxSite = "/etc/nginx/sites-enabled/nevsky-songs";
    if (!exists(nginxSite)) {
      console.log("[setup] Настраиваю nginx (порт 80 → 3000)...");
      const nginxInstalled = run("which nginx");
      if (!nginxInstalled) run("apt-get install -y nginx");
      const conf = `server {
  listen 80;
  server_name _;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}`;
      fs.writeFileSync("/etc/nginx/sites-available/nevsky-songs", conf);
      run("ln -sf /etc/nginx/sites-available/nevsky-songs /etc/nginx/sites-enabled/nevsky-songs");
      run("rm -f /etc/nginx/sites-enabled/default");
      run("nginx -t && systemctl reload nginx");
      run("systemctl enable nginx");
      console.log("[setup] Nginx настроен. Доступ: http://raspberrypi-songs.local");
    }
  })().catch(() => {});
}

// --------- HID Clicker + WebSocket ---------
// --------- HID Clicker + WebSocket ---------
import HID from "node-hid";
import { WebSocket, WebSocketServer } from "ws";

let wss = null;
let device = null;
const receiverClients = new Set(); // браузеры
let remoteSender = null;           // RPi5 sender на VPS
let vpsSender = null;              // наш исходящий коннект к VPS (с RPi5)

const CLICKER_SECRET = process.env.CLICKER_SENDER_SECRET || "";

const broadcastToReceivers = (msg) => {
  const data = JSON.stringify(msg);
  receiverClients.forEach((c) => { if (c.readyState === 1) c.send(data); });
};

const broadcast = (action) => {
  console.log(`[clicker] ${action}`);
  broadcastToReceivers({ type: "clicker", direction: action });
  if (vpsSender?.readyState === 1) {
    vpsSender.send(JSON.stringify({ type: "clicker", direction: action }));
  }
};

const broadcastStatus = (connected) => {
  broadcastToReceivers({ type: "clicker-connected", connected });
  if (vpsSender?.readyState === 1) {
    vpsSender.send(JSON.stringify({ type: "clicker-connected", connected }));
  }
};

// wss.on("connection") инициализируется после httpServer

const connectDevice = () => {
  if (device) return; // уже подключено

  const all = HID.devices().filter(
    (d) => d.vendorId === 1452 && d.productId === 556
  );

  for (const d of all) {
    try {
      device = new HID.HID(d.path);
      console.log(`[clicker] Устройство подключено: usage=${d.usage}`);
      broadcastStatus(true);

      // Средняя кнопка: одно нажатие — реприза (если она сейчас есть на
      // странице), два быстрых подряд — открыть боковую панель. Мерить, как
      // долго кнопка зажата, оказалось неудобно для человека (не считается
      // надёжно "долгим") — вместо этого считаем нажатия за короткое окно.
      // Первое нажатие откладывается на это окно: если за него придёт
      // второе — считаем как двойное и открываем панель, иначе — реприза
      const DOUBLE_PRESS_WINDOW_MS = 600;
      let middleClickTimer = null;
      let middleClickCount = 0;
      let lastMiddleClickAt = 0;

      // ВРЕМЕННО: подробный лог сырых кадров средней кнопки — чтобы увидеть
      // по факту (не вживую по чату, а потом в логе), с каким реальным
      // интервалом прилетают два нажатия и какое решение из-за этого
      // принимается. Убрать, когда двойное нажатие подтвердится вживую
      device.on("data", (data) => {
        if (data[0] !== 0x03) return;

        const btn = data[2];
        const extra = data[1];

        if (extra === 0x04 && btn === 0x00) {
          const now = Date.now();
          const gap = lastMiddleClickAt ? now - lastMiddleClickAt : null;
          lastMiddleClickAt = now;
          middleClickCount++;
          console.log(`[clicker-diag] средняя нажата #${middleClickCount}${gap !== null ? `, с прошлой ${gap}мс` : ""}`);

          if (middleClickCount === 1) {
            middleClickTimer = setTimeout(() => {
              console.log("[clicker-diag] окно истекло без второго нажатия -> reprise");
              middleClickTimer = null;
              middleClickCount = 0;
              broadcast("reprise");
            }, DOUBLE_PRESS_WINDOW_MS);
          } else {
            console.log("[clicker-diag] второе нажатие успело в окно -> middle (панель)");
            clearTimeout(middleClickTimer);
            middleClickTimer = null;
            middleClickCount = 0;
            broadcast("middle");
          }
          return;
        }

        let action = null;
        if (btn === 0x01) action = "up";
        else if (btn === 0x02) action = "down";

        if (!action) return;
        broadcast(action);
      });

      device.on("error", (err) => {
        console.log("[clicker] Устройство отключено, жду переподключения...");
        device = null;
        broadcastStatus(false);
      });

      break;
    } catch (e) {}
  }
};

// Подключаем сразу при старте, потом проверяем каждые 2 секунды
connectDevice();
setInterval(connectDevice, 2000);

// Рассылаем актуальный статус браузерам каждую секунду
setInterval(() => broadcastToReceivers({ type: "clicker-connected", connected: !!device || !!remoteSender }), 1000);

// Если задан CLICKER_VPS_URL — подключаемся к VPS как sender (RPi5 → VPS)
const startVpsSender = () => {
  const VPS_URL = process.env.CLICKER_VPS_URL;
  if (!VPS_URL || !CLICKER_SECRET) return;
  if (vpsSender) return;

  // Заголовок x-clicker-sender при апгрейде до VPS не доезжает (проверено
  // напрямую: соединение открывается, но сервер отправителя не узнаёт),
  // а секрет в строке запроса на этом пути прокси вообще превращает в 502
  // (тоже проверено — без query соединение открывается нормально). Поэтому
  // подтверждаемся уже ПОСЛЕ открытия — обычным сообщением по тому же
  // каналу, что и так работает для нажатий. Заголовок оставлен на всякий
  // случай — вдруг где-то всё-таки доедет (например, с другой сети)
  vpsSender = new WebSocket(VPS_URL, {
    headers: { "x-clicker-sender": CLICKER_SECRET },
  });

  vpsSender.on("open", () => {
    console.log("[clicker] Sender подключился к VPS:", VPS_URL);
    vpsSender.send(JSON.stringify({ type: "sender-auth", secret: CLICKER_SECRET }));
    vpsSender.send(JSON.stringify({ type: "clicker-connected", connected: !!device }));
  });

  vpsSender.on("close", () => {
    vpsSender = null;
    setTimeout(startVpsSender, 5000);
  });

  vpsSender.on("error", () => {});
};
startVpsSender();

process.on("SIGINT", () => {
  if (device) device.close();
  if (vpsSender) vpsSender.close();
  process.exit(0);
});
// -------------------------------------------

//--------NeDB---------
import Datastore from "nedb";
import bcrypt from "bcryptjs";

export const database = new Datastore("database.db");
database.loadDatabase();

const defaultUsers = [
  {
    _id: "regent",
    username: "regent",
    password: process.env.REGENT_PASSWORD,
    docType: "admin",
    role: "регент",
  },
  {
    _id: "singer",
    username: "singer",
    password: process.env.SINGER_PASSWORD,
    docType: "user",
    role: "певчие",
  },
];

const createDefaultUsersIfEmpty = async () => {
  database.count(
    { docType: { $in: ["admin", "user"] } },
    async (err, count) => {
      if (err) {
        console.error("Ошибка при подсчёте пользователей:", err);
        return;
      }
      if (count === 0) {
        for (const user of defaultUsers) {
          if (!user.password) {
            console.warn(
              `Warning: Password for user ${user.username} is not set. Skipping user creation.`
            );
            continue;
          }
          try {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const userWithHashedPassword = { ...user, password: hashedPassword };
            database.insert(userWithHashedPassword, (err, doc) => {
              if (err) {
                console.log("Ошибка добавления пользователя:", err);
              } else {
                console.log("Добавлен пользователь:", user.username);
              }
            });
          } catch (error) {
            console.error("Ошибка хеширования пароля:", error);
          }
        }
      }
    }
  );
};

createDefaultUsersIfEmpty();

import { dirname } from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cors from "cors";

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(__dirname + "/build"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + "/uploads");
  },
  filename: function (req, file, cb) {
    let decodedName = Buffer.from(file.originalname, "latin1").toString("utf8");

    const ext = decodedName.substring(decodedName.lastIndexOf("."));
    let baseName = decodedName.substring(0, decodedName.lastIndexOf("."));

    baseName = baseName
      .replace(/[^a-zA-Zа-яА-Я0-9-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    let finalName = `${baseName}${ext}`;
    let counter = 1;

    while (fs.existsSync(__dirname + "/uploads/" + finalName)) {
      finalName = `${baseName}_${counter}${ext}`;
      counter++;
    }

    cb(null, finalName);
  },
});
const upload = multer({ storage: storage });

const urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const httpServer = createServer(app);

// WebSocket кликера — на том же httpServer по пути /ws-clicker
// (через nginx proxied с SSL, без отдельного порта 3001)
try {
  wss = new WebSocketServer({ server: httpServer, path: "/ws-clicker" });
  console.log("[clicker] WebSocket подключён к httpServer по пути /ws-clicker");

  wss.on("connection", (ws, req) => {
    // Заголовок x-clicker-sender при апгрейде до этого VPS не доезжает
    // (проверено напрямую: соединение открывается, а сервер отправителя не
    // узнаёт), поэтому основной путь — подтверждение уже после открытия,
    // обычным сообщением {type:"sender-auth", secret} по каналу, который и
    // так работает (см. startVpsSender). Заголовок оставлен как быстрый
    // путь на случай, если где-то всё-таки доедет
    let confirmedSender = !!CLICKER_SECRET && req.headers["x-clicker-sender"] === CLICKER_SECRET;

    if (confirmedSender) {
      remoteSender = ws;
      console.log("[clicker] Sender (RPi5) подключился");
      broadcastToReceivers({ type: "clicker-connected", connected: true });
    } else {
      receiverClients.add(ws);
      ws.send(JSON.stringify({ type: "clicker-connected", connected: !!device || !!remoteSender }));
    }

    ws.on("message", (rawData) => {
      let msg;
      try { msg = JSON.parse(rawData.toString()); } catch { return; }

      if (!confirmedSender) {
        if (msg.type === "sender-auth" && CLICKER_SECRET && msg.secret === CLICKER_SECRET) {
          confirmedSender = true;
          receiverClients.delete(ws);
          remoteSender = ws;
          console.log("[clicker] Sender (RPi5) подключился");
          broadcastToReceivers({ type: "clicker-connected", connected: true });
        }
        // Обычные зрители ничего больше не присылают — остальное молча игнорируем
        return;
      }

      broadcastToReceivers(msg);
    });

    ws.on("close", () => {
      if (confirmedSender) {
        remoteSender = null;
        console.log("[clicker] Sender (RPi5) отключился");
        broadcastToReceivers({ type: "clicker-connected", connected: !!device });
      } else {
        receiverClients.delete(ws);
      }
    });

    ws.on("error", () => {
      if (confirmedSender) remoteSender = null;
      else receiverClients.delete(ws);
    });
  });
} catch (err) {
  console.warn("[clicker] WebSocket не удалось запустить:", err);
}

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// QR Sessions
const qrSessions = new Map();

app.post("/auth/qr/generate", (req, res) => {
  const { socketId } = req.body;
  const token =
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  qrSessions.set(token, { otp, socketId, expiresAt });
  setTimeout(() => qrSessions.delete(token), 5 * 60 * 1000);
  res.json({ token, otp, localIP: getLocalIP() });
});

app.post("/auth/qr/verify", (req, res) => {
  const { token, otp } = req.body;
  const session = qrSessions.get(token);
  if (!session) return res.status(400).json({ error: "Сессия не найдена" });
  if (Date.now() > session.expiresAt) {
    qrSessions.delete(token);
    return res.status(400).json({ error: "QR-код истёк" });
  }
  if (session.otp !== otp) return res.status(400).json({ error: "Неверный код" });

  qrSessions.delete(token);

  const targetSocket = io.sockets.sockets.get(session.socketId);
  if (targetSocket) targetSocket.emit("qr-verified", { token });

  res.json({ status: "ok", userId: "singer", username: "singer", role: "певчие" });
});

io.on("connection", (socket) => {
  socket.on("join-stack", (stackId) => {
    if (!stackId) return;
    socket.join(stackId);
  });

  socket.on("stack-updated", (payload = {}) => {
    const { stackId, songs = [], mealType = null, programSelected = [] } = payload;

    if (!stackId) return;

    socket.to(stackId).emit("stack-updated", {
      stackId,
      songs,
      mealType,
      programSelected,
    });
  });

  socket.on("stack-visibility-changed", (payload = {}) => {
    const { stackId, isPublished, deleted, stackData } = payload;
    if (!stackId) return;
    // broadcast to ALL connected clients (including sender)
    io.emit("stack-visibility-changed", { stackId, isPublished, deleted, stackData });
  });
});

httpServer.listen(PORT, () => {
  console.log("express on 4000");
});

app.get("/", (req, res) => {
  res.send("hello my dear");
});

// ── Ping / health-check ──────────────────────────────────────────────────────
// Используется фронтендом для обнаружения локального сервера.
// CORS * — намеренно, чтобы основной HTTPS-сайт мог сделать preflight.
app.get("/api/ping", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({ ok: true, local: true, ts: Date.now() });
});

// Проверить сертификат прямо сейчас, не дожидаясь обхода раз в час.
//
// Нужно для кнопки «Обновить» в окне платы: неудачная проверка записывается
// в файл состояния и показывается до следующей удачной, а следующая — только
// через час. Человек тем временем уже подключил плату к интернету и хочет
// увидеть итог сразу, а не ждать и гадать, устарело сообщение или нет.
app.post("/api/cert-refresh", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { syncCertificate } = await import("./cert-sync.js");
    await syncCertificate();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Сколько устройств сейчас на связи и по каким программам они разошлись.
// Нужно, чтобы во время службы было видно реальное число планшетов, а не
// приходилось судить по косвенным признакам
app.get("/api/clients", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const byStack = {};
  for (const [room, members] of io.sockets.adapter.rooms) {
    // В rooms попадают и личные комнаты сокетов — у них имя совпадает с id
    if (io.sockets.sockets.has(room)) continue;
    byStack[room] = members.size;
  }

  res.json({ count: io.engine.clientsCount, byStack });
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: "error", message: "Файл не загружен" });
  }

  const fileData = {
    _id: Date.now().toString(),
    originalName: req.file.filename,
    path: req.file.path,
    mimetype: req.file.mimetype,
    size: req.file.size,
    ...req.body,
  };

  console.log("file data", fileData);

  database.insert(fileData, (err, doc) => {
    if (err) {
      console.log("err", err);
      return res.status(500).json({ status: "error", message: "Не удалось сохранить запись" });
    }
    console.log("adding file:", fileData.originalName);
    res.json({ status: "ok", doc });
  });
});

songsRoutes(app, urlencodedParser, upload);
usersRoutes(app, urlencodedParser);
stacksRoutes(app, urlencodedParser);
syncRoutes(app, upload);
recommendRoutes(app);
analyzeRoutes(app);
categoriesRoutes(app);

// Запускаем планировщик только на локальном сервере (IS_LOCAL_SERVER=true)
startSyncScheduler();

/**
 * Автоматическая уборка раз в сутки: файлы-сироты в uploads (замена скана
 * или картинки раздела больше не оставляет старый файл висеть навсегда) и
 * soft-deleted записи старше 30 дней.
 *
 * Резервная копия перед каждым запуском — своя страховка на случай, если
 * поиск ничьих файлов где-то ошибётся. Без метки, чтобы участвовать в
 * обычной ротации backup.sh (последние 10), а не копиться бесконечно.
 */
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
async function runAutoCleanup() {
  try {
    execSync(`bash "${path.join(__dirname, "scripts", "backup.sh")}"`, { stdio: "ignore" });
  } catch (e) {
    console.warn("[cleanup] Резервная копия перед автоуборкой не удалась, уборку пропускаю:", e.message);
    return;
  }
  try {
    const { runCleanup } = await import("./cleanup-core.js");
    const result = await runCleanup({
      database,
      uploadsDir: path.join(__dirname, "uploads"),
      purgeDays: 30,
    });
    console.log(
      `[cleanup] Автоуборка: файлов удалено ${result.orphanFiles.length}, записей удалено ${result.purgedCount}`,
    );
  } catch (e) {
    console.error("[cleanup] Автоуборка сорвалась:", e);
  }
}
// Не сразу при старте — даём серверу спокойно подняться
setTimeout(runAutoCleanup, 5 * 60 * 1000);
setInterval(runAutoCleanup, CLEANUP_INTERVAL_MS);

const deleteOldFiles = (fileName) => {
  fs.readdirSync(__dirname + "/uploads").forEach((file) => {
    console.log(file);
    if (file !== fileName) {
      fs.unlinkSync(__dirname + `/uploads/${file}`);
    }
  });
};

app.use("/uploads", express.static(__dirname + "/uploads"));
