import express from "express";
const app = express();
import bodyParser from "body-parser";
import fs, { stat } from "fs";
import { songsRoutes } from "./routes/songs.js";
import { stacksRoutes } from "./routes/stacks.js";
import { usersRoutes } from "./routes/users.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // явно указываем путь к файлу

//--------NeDB---------
import Datastore from "nedb";

import bcrypt from "bcryptjs";

export const database = new Datastore("database.db");
database.loadDatabase();

// users

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

// Функция для создания пользователей, если база пуста
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
              `Warning: Password for user ${user.username} is not set. Skipping user creation.`,
            );
            continue;
          }
          try {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const userWithHashedPassword = {
              ...user,
              password: hashedPassword,
            };
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
    },
  );
};

createDefaultUsersIfEmpty();

import { dirname } from "path";
import { fileURLToPath } from "url";

import multer from "multer";

import cors from "cors";

app.use(
  cors({
    origin: "http://localhost:3000", // адрес фронтенда
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(__dirname + "/build"));

app.use(express.static(__dirname + "/uploads"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + "/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

const urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("express on 4000");
});

app.get("/", (req, res) => {
  res.send("hello my dear");
});

// Загрузка файла
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ status: "error", message: "Файл не загружен" });
  }

  const fileData = {
    _id: Date.now().toString(), // или req.file.filename
    originalName: req.file.originalname,
    path: req.file.path,
    mimetype: req.file.mimetype,
    size: req.file.size,
    ...req.body, // если есть дополнительные данные
  };

  console.log("file data", fileData);

  database.insert(fileData, (err, doc) => {
    if (err) {
      console.log("err", err);
      return res
        .status(500)
        .json({ status: "error", message: "Не удалось сохранить запись" });
    }
    console.log("adding file:", fileData.originalName); // Вот тут надо настроить чтобы название было нормальное, а не с битой кодировкой
    res.json({ status: "ok", doc });
  });
});

// Ноты
songsRoutes(app, urlencodedParser, upload);

// Пользователи
usersRoutes(app, urlencodedParser);

// Стопки
stacksRoutes(app, urlencodedParser);

const deleteOldFiles = (fileName) => {
  // Считываем все файлы и удаяем файл, если его имя не совпадает с fileName
  fs.readdirSync(__dirname + "/uploads").forEach((file) => {
    console.log(file);
    if (file !== fileName) {
      // Удаляем
      fs.unlinkSync(__dirname + `/uploads/${file}`);
    }
  });
};

// app.post("/upload", upload.single("docx"), function (req, res, next) {
//   console.log("POST /upload", req.file);

//   const fileName = req.file.originalname;
//   deleteOldFiles(fileName);
//   res.json({ status: "ok" });
// });

app.use("/uploads", express.static("uploads"));
