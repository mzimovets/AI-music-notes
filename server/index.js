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
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
dotenv.config({ path: ".env.local" });

// --------- HID Clicker + WebSocket ---------
// --------- HID Clicker + WebSocket ---------
import HID from "node-hid";
import { WebSocketServer } from "ws";

let wss = null;
try {
  wss = new WebSocketServer({ port: 3001 });
  console.log("[clicker] WebSocket сервер запущен на ws://localhost:3001");
} catch (err) {}

let device = null;

const broadcast = (action) => {
  if (!wss) return;
  console.log(`[clicker] ${action}`);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: "clicker", direction: action }));
    }
  });
};

const broadcastStatus = (connected) => {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: "clicker-connected", connected }));
    }
  });
};

// При подключении нового клиента сразу отправляем текущий статус
if (wss) {
  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "clicker-connected", connected: !!device }));
  });
}

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

      device.on("data", (data) => {
        if (data[0] !== 0x03) return;

        const btn = data[2];
        const extra = data[1];
        let action = null;

        if (btn === 0x01) action = "up";
        else if (btn === 0x02) action = "down";
        else if (extra === 0x04 && btn === 0x00) action = "middle";

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

// Рассылаем актуальный статус всем клиентам каждую секунду
setInterval(() => broadcastStatus(!!device), 1000);

process.on("SIGINT", () => {
  if (device) device.close();
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

const io = new SocketIOServer(httpServer, {
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
    const { stackId, songs = [], mealType = null } = payload;

    if (!stackId) return;

    socket.to(stackId).emit("stack-updated", {
      stackId,
      songs,
      mealType,
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

const deleteOldFiles = (fileName) => {
  fs.readdirSync(__dirname + "/uploads").forEach((file) => {
    console.log(file);
    if (file !== fileName) {
      fs.unlinkSync(__dirname + `/uploads/${file}`);
    }
  });
};

app.use("/uploads", express.static(__dirname + "/uploads"));
