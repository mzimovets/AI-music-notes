import express from "express";
const app = express();
import bodyParser from "body-parser";
import docxParser from "docx-parser";
import fs, { stat } from "fs";

//--------NeDB---------
import Datastore from "nedb";

export const database = new Datastore("database.db");
database.loadDatabase();

import { dirname } from "path";
import { fileURLToPath } from "url";

import multer from "multer";
import { data } from "framer-motion/client";

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

  database.insert(fileData, (err, doc) => {
    if (err) {
      console.log("err", err);
      return res
        .status(500)
        .json({ status: "error", message: "Не удалось сохранить запись" });
    }
    console.log("adding file:", fileData.originalName);
    res.json({ status: "ok", doc });
  });
});

// Ноты
app.get("/song/:songId", (req, res) => {
  database.findOne({ _id: req.params.songId }, (err, doc) => {
    console.log("getting song: ", req.params.songId);
    if (err) {
      console.log("no find", err);
    }
    res.json({ status: "ok", doc });
  });
});

app.get("/songs", (req, res) => {
  database.find({ docType: "song" }, (err, docs) => {
    console.log("getting songs: ", docs);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", docs });
  });
});

app.post("/song/:songId", (req, res) => {
  database.insert({ _id: req.params.songId, ...req.body }, (err, doc) => {
    console.log("adding song: ", req.params.songId);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", doc });
  });
});

app.put("/song/:songId", (req, res) => {
  database.update({ _id: req.params.songId, ...req.body }, (err, doc) => {
    console.log("edited song: ", req.params.songId);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", doc });
  });
});

// Пользователи
app.get("/user/:userId", (req, res) => {
  database.findOne({ _id: req.params.userId }, (err, doc) => {
    console.log("getting user: ", req.params.userId);
    if (err) {
      console.log("no find", err);
    }
    res.json({ status: "ok", doc });
  });
});

app.get("/users", (req, res) => {
  database.find({ docType: "user" }, (err, docs) => {
    console.log("getting users: ", docs);
    if (err) {
      console.log("no find", err);
    }
    res.json({ status: "ok", docs });
  });
});

app.post("/user/:userId", (req, res) => {
  database.insert({ _id: req.params.userId, ...req.body }, (err, doc) => {
    console.log("adding user: ", req.params.userId);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", doc });
  });
});

app.put("/user/:userId", (req, res) => {
  database.update({ _id: req.params.userId, ...req.body }, (err, doc) => {
    console.log("edited user: ", req.params.userId);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", doc });
  });
});

app.delete("/user/:userId", (req, res) => {
  database.remove({ _id: req.params.userId }, (err, numDeleted) => {
    console.log("delete stack: ", req.params.userId);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", numDeleted });
  });
});

// Стопки

app.get("/stack/:stackId", (req, res) => {
  database.findOne({ _id: req.params.stackId }, (err, doc) => {
    console.log("getting stack: ", req.params.stackId);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", doc });
  });
});

app.get("/stacks", (req, res) => {
  database.find({ docType: "stack" }, (err, docs) => {
    console.log("getting stacks: ", docs);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", docs });
  });
});

app.post("/stack/:stackId", (req, res) => {
  database.insert({ _id: req.params.stackId, ...req.body }, (err, doc) => {
    console.log("adding stack: ", req.params.stackId);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", doc });
  });
});

app.put("/stack/:stackId", (req, res) => {
  database.update({ _id: req.params.stackId, ...req.body }, (err, doc) => {
    console.log("editer stack: ", req.params.stackId);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", doc });
  });
});

app.delete("/stack/:stackId", (req, res) => {
  database.remove({ _id: req.params.stackId }, (err, numDeleted) => {
    console.log("delete stack: ", req.params.stackId);
    if (err) {
      console.log("err", err);
    }
    res.json({ status: "ok", numDeleted });
  });
});

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

app.post("/upload", upload.single("docx"), function (req, res, next) {
  console.log("POST /upload", req.file);

  const fileName = req.file.originalname;
  deleteOldFiles(fileName);
  res.json({status: 'ok'})
});

app.use("/uploads", express.static("uploads"));
