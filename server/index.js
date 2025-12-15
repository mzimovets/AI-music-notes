import express from "express";
const app = express();
import bodyParser from "body-parser";
import fs, { stat } from "fs";
import { songsRoutes } from "./routes/songs.js";
import { stacksRoutes } from "./routes/stacks.js";
import { usersRoutes } from "./routes/users.js";

//--------NeDB---------
import Datastore from "nedb";

export const database = new Datastore("database.db");
database.loadDatabase();

import { dirname } from "path";
import { fileURLToPath } from "url";

import multer from "multer";

import cors from "cors";

app.use(
  cors({
    origin: "http://localhost:3000", // адрес фронтенда
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
songsRoutes(app, urlencodedParser);

// Пользователи
usersRoutes(app);

// Стопки
stacksRoutes(app);

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
