import express from "express";
const app = express();
import bodyParser from "body-parser";
import fs, { stat } from "fs";
import { createServer } from "http";
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

const connectDevice = () => {
  if (device) return; // уже подключено

  const all = HID.devices().filter(
    (d) => d.vendorId === 1452 && d.productId === 556
  );

  for (const d of all) {
    try {
      device = new HID.HID(d.path);
      console.log(`[clicker] Устройство подключено: usage=${d.usage}`);

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
        device = null; // сбрасываем, чтобы tryConnect снова нашёл
      });

      break;
    } catch (e) {}
  }
};

// Проверяем каждые 2 секунды
setInterval(connectDevice, 2000);

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
    _id: "bishop",
    username: "bishop",
    password: process.env.BISHOP_PASSWORD,
    docType: "user",
    role: "епископ",
  },
  {
    _id: "singer",
    username: "singer",
    password: process.env.SINGER_PASSWORD,
    docType: "user",
    role: "певчие",
  },
];

const createMissingDefaultUsers = async () => {
  for (const user of defaultUsers) {
    if (!user.password) {
      console.warn(
        `Warning: Password for user ${user.username} is not set. Skipping user creation.`
      );
      continue;
    }

    const existingUser = await new Promise((resolve, reject) => {
      database.findOne({ _id: user._id }, (err, doc) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(doc);
      });
    }).catch((error) => {
      console.error("Ошибка при поиске пользователя:", error);
      return null;
    });

    if (existingUser) {
      continue;
    }

    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const userWithHashedPassword = { ...user, password: hashedPassword };

      database.insert(userWithHashedPassword, (err) => {
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
};

createMissingDefaultUsers();

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

const CHAT_ROOM_ID = "private-chat-regent-bishop";
const CHAT_ALLOWED_USERS = ["regent", "bishop"];
const CHAT_ALLOWED_USERS_SET = new Set(CHAT_ALLOWED_USERS);
const CHAT_RETENTION_MS = 6 * 60 * 60 * 1000;
const CHAT_CLEANUP_INTERVAL_MS = 60 * 1000;
const CHAT_STATE_DOC_PREFIX = "chat-state:";
const chatSocketsByUser = new Map(
  CHAT_ALLOWED_USERS.map((username) => [username, new Set()])
);

const getChatUserRoom = (username) => `private-chat-user:${username}`;
const getChatStateDocId = (username) => `${CHAT_STATE_DOC_PREFIX}${username}`;
const getChatExpiryCutoff = () =>
  new Date(Date.now() - CHAT_RETENTION_MS).toISOString();

const getChatCompanion = (username) =>
  CHAT_ALLOWED_USERS.find((item) => item !== username) || null;

const getChatState = (username) =>
  new Promise((resolve, reject) => {
    database.findOne(
      { _id: getChatStateDocId(username), docType: "chatState" },
      (err, doc) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(doc || null);
      }
    );
  });

const upsertChatState = (username, patch = {}) =>
  new Promise((resolve, reject) => {
    const stateDoc = {
      _id: getChatStateDocId(username),
      docType: "chatState",
      roomId: CHAT_ROOM_ID,
      username,
      ...patch,
    };

    database.update(
      { _id: stateDoc._id },
      { $set: stateDoc },
      { upsert: true },
      (err, updatedCount) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(updatedCount || 0);
      }
    );
  });

const cleanupExpiredChatMessages = () =>
  new Promise((resolve, reject) => {
    database.remove(
      {
        docType: "chatMessage",
        roomId: CHAT_ROOM_ID,
        createdAt: { $lt: getChatExpiryCutoff() },
      },
      { multi: true },
      (err, removedCount) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(removedCount || 0);
      }
    );
  });

const getChatVisibilityQuery = async (username) => {
  const chatState = await getChatState(username);
  const expiryCutoff = getChatExpiryCutoff();

  if (chatState?.clearedAt && chatState.clearedAt > expiryCutoff) {
    return { createdAt: { $gt: chatState.clearedAt } };
  }

  return { createdAt: { $gte: expiryCutoff } };
};

const getChatHistory = async (username) => {
  const visibilityQuery = await getChatVisibilityQuery(username);

  return new Promise((resolve, reject) => {
    database
      .find({
        docType: "chatMessage",
        roomId: CHAT_ROOM_ID,
        ...visibilityQuery,
      })
      .sort({ createdAt: 1 })
      .exec((err, docs) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(docs || []);
      });
  });
};

const getUnreadChatCount = async (username) => {
  const visibilityQuery = await getChatVisibilityQuery(username);

  return new Promise((resolve, reject) => {
    database.count(
      {
        docType: "chatMessage",
        roomId: CHAT_ROOM_ID,
        receiver: username,
        isRead: false,
        ...visibilityQuery,
      },
      (err, count) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(count || 0);
      }
    );
  });
};

const markChatAsRead = async (username, readAt) => {
  const visibilityQuery = await getChatVisibilityQuery(username);

  return new Promise((resolve, reject) => {
    database.update(
      {
        docType: "chatMessage",
        roomId: CHAT_ROOM_ID,
        receiver: username,
        isRead: false,
        ...visibilityQuery,
      },
      {
        $set: {
          isRead: true,
          readAt,
        },
      },
      { multi: true },
      (err, updatedCount) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(updatedCount || 0);
      }
    );
  });
};

const insertChatMessage = (messageDoc) =>
  new Promise((resolve, reject) => {
    database
      .insert(messageDoc, (err, doc) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(doc);
      });
  });

const getOnlineChatUsers = () =>
  CHAT_ALLOWED_USERS.filter((username) => {
    const sockets = chatSocketsByUser.get(username);
    return Boolean(sockets && sockets.size > 0);
  });

const emitChatPresence = () => {
  io.to(CHAT_ROOM_ID).emit("chat:presence", {
    onlineUsers: getOnlineChatUsers(),
  });
};

const registerChatSocket = (socket, username) => {
  const previousUsername = socket.data.chatUsername;

  if (previousUsername && chatSocketsByUser.has(previousUsername)) {
    chatSocketsByUser.get(previousUsername).delete(socket.id);
    socket.leave(getChatUserRoom(previousUsername));
    socket.leave(CHAT_ROOM_ID);
  }

  socket.data.chatUsername = username;
  chatSocketsByUser.get(username).add(socket.id);
  socket.join(CHAT_ROOM_ID);
  socket.join(getChatUserRoom(username));
};

const unregisterChatSocket = (socket) => {
  const username = socket.data.chatUsername;

  if (!username || !chatSocketsByUser.has(username)) {
    return;
  }

  chatSocketsByUser.get(username).delete(socket.id);
  socket.leave(getChatUserRoom(username));
  socket.leave(CHAT_ROOM_ID);
  delete socket.data.chatUsername;
};

const refreshChatUnreadCounts = async () => {
  const unreadCounts = await Promise.all(
    CHAT_ALLOWED_USERS.map(async (username) => ({
      username,
      unreadCount: await getUnreadChatCount(username),
    }))
  );

  unreadCounts.forEach(({ username, unreadCount }) => {
    io.to(getChatUserRoom(username)).emit("chat:unread-count", unreadCount);
  });
};

const runChatCleanup = async () => {
  try {
    const removedCount = await cleanupExpiredChatMessages();

    if (removedCount > 0) {
      await refreshChatUnreadCounts();
    }
  } catch (error) {
    console.error("Ошибка очистки старых сообщений чата:", error);
  }
};

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

  socket.on("chat:register", async ({ username } = {}) => {
    if (!CHAT_ALLOWED_USERS_SET.has(username)) {
      return;
    }

    registerChatSocket(socket, username);

    try {
      await cleanupExpiredChatMessages();

      const [messages, unreadCount] = await Promise.all([
        getChatHistory(username),
        getUnreadChatCount(username),
      ]);

      socket.emit("chat:bootstrap", {
        messages,
        unreadCount,
        onlineUsers: getOnlineChatUsers(),
      });

      emitChatPresence();
    } catch (error) {
      console.error("Ошибка инициализации чата:", error);
    }
  });

  socket.on("chat:send-message", async ({ text } = {}) => {
    const sender = socket.data.chatUsername;
    const trimmedText = typeof text === "string" ? text.trim() : "";

    if (!CHAT_ALLOWED_USERS_SET.has(sender) || !trimmedText) {
      return;
    }

    const receiver = getChatCompanion(sender);

    if (!receiver) {
      return;
    }

    const messageDoc = {
      _id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      docType: "chatMessage",
      roomId: CHAT_ROOM_ID,
      sender,
      receiver,
      text: trimmedText,
      createdAt: new Date().toISOString(),
      isRead: false,
      readAt: null,
    };

    try {
      await cleanupExpiredChatMessages();
      const savedMessage = await insertChatMessage(messageDoc);
      io.to(CHAT_ROOM_ID).emit("chat:new-message", savedMessage);

      const [receiverUnreadCount, senderUnreadCount] = await Promise.all([
        getUnreadChatCount(receiver),
        getUnreadChatCount(sender),
      ]);

      io.to(getChatUserRoom(receiver)).emit(
        "chat:unread-count",
        receiverUnreadCount
      );
      io.to(getChatUserRoom(sender)).emit("chat:unread-count", senderUnreadCount);
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
    }
  });

  socket.on("chat:mark-read", async () => {
    const username = socket.data.chatUsername;

    if (!CHAT_ALLOWED_USERS_SET.has(username)) {
      return;
    }

    const readAt = new Date().toISOString();

    try {
      await cleanupExpiredChatMessages();
      const updatedCount = await markChatAsRead(username, readAt);
      const unreadCount = await getUnreadChatCount(username);

      io.to(getChatUserRoom(username)).emit("chat:unread-count", unreadCount);

      if (updatedCount > 0) {
        io.to(CHAT_ROOM_ID).emit("chat:messages-read", {
          reader: username,
          readAt,
        });
      }
    } catch (error) {
      console.error("Ошибка пометки сообщений как прочитанных:", error);
    }
  });

  socket.on("chat:clear", async () => {
    const username = socket.data.chatUsername;

    if (!CHAT_ALLOWED_USERS_SET.has(username)) {
      return;
    }

    const clearedAt = new Date().toISOString();

    try {
      await cleanupExpiredChatMessages();
      await upsertChatState(username, { clearedAt });

      io.to(getChatUserRoom(username)).emit("chat:cleared", {
        clearedAt,
        unreadCount: 0,
      });
    } catch (error) {
      console.error("Ошибка персональной очистки чата:", error);
    }
  });

  socket.on("disconnect", () => {
    const hadRegisteredChatUser = Boolean(socket.data.chatUsername);
    unregisterChatSocket(socket);

    if (hadRegisteredChatUser) {
      emitChatPresence();
    }
  });
});

runChatCleanup();
setInterval(runChatCleanup, CHAT_CLEANUP_INTERVAL_MS);

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
