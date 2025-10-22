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

const wrapOnParagraph = (text) => {
  return `
  <p></p>`;
};

// Убирает точки в конце строк. Не идеально.
const removeEndLineDots = (line) => {
  console.log("line", line);
  const lineWithoutMiddleDots = line?.replace(/\.\s*\t*\S*\u00A0*\r*?\n/, "\n");
  return lineWithoutMiddleDots?.replace(/\.\s*\t*$/, "\n");
};

function formatSchedule(text) {
  if (text) {
    console.log("SYMBOLS", [...text].map((c) => c.charCodeAt(0)).join(" "));
  }
  return (
    text
      ?.replace(/(\d{2}:\d{2} –)/g, (match, time, offset) => {
        return (offset === 0 ? "" : "\n") + "<p>" + match;
      })
      .replace(/([^\S\s\u00A0\t\r\n]+)?\.(?=\s*(\d{2}:\d{2} –))/g, "$1") // Убираем точку перед временем и пробелы
      .replace(/\.(?=\n|$)/g, "") + // Убираем точки в конце абзацев
    "</p>"
  );
}

const inputText =
  "07:00 – Ранняя Литургия свт. Василия Великого 10:00 – Поздняя Литургия свт. Василия Великого. 17:00 – Вечернее богослужение. Пассия";
const formattedText = formatSchedule(inputText);

console.log(formattedText);

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

  docxParser.parseDocx(__dirname + `/uploads/${fileName}`, function (data) {
    let trimmed = data.replace(/Расписание (.+\n){0,4}Святые дня/gm, "");
    trimmed = trimmed.replace(/\r\n\n\n/g, "");
    trimmed = trimmed.replace(/~https?:\/\/\S+~i/, "");
    const dateArray = trimmed.match(/\d+\s.+г\./g);

    dateArray.unshift("");
    const ar = trimmed.split(/\d+\s.+г\./g);

    const ids = [
      "firstSunday",
      "monday",
      "tuesday",
      "wendsday",
      "thursday",
      "friday",
      "saturday",
      "secondSunday",
    ];
    const options = [
      { value: "01", label: "Января" },
      { value: "02", label: "Февраля" },
      { value: "03", label: "Марта" },
      { value: "04", label: "Апреля" },
      { value: "05", label: "Мая" },
      { value: "06", label: "Июня" },
      { value: "07", label: "Июля" },
      { value: "08", label: "Августа" },
      { value: "09", label: "Сентября" },
      { value: "10", label: "Октября" },
      { value: "11", label: "Ноября" },
      { value: "12", label: "Декабря" },
    ];

    const scheduleSeparated = ar?.map((elem, index) => {
      // я бы перед часами в расписании выставлял бы принудителоьно \n
      // Потому что не всегда в доке стоит \n
      console.log("elem", elem);
      const times = elem.match(/\d+:\d+\s?–\s?(.*\n)/gm)?.join("");
      console.log("times", times);
      const day = elem.substring(times?.length, elem.length);
      console.log("day", times);
      const dateString = dateArray[index] || "";

      const monthName = dateString
        .substring(dateString.indexOf(" ") + 1, dateString.indexOf("*") - 1)
        .trim();
      console.log("monthName", monthName);

      let monthNumber = "";
      options.forEach((month) => {
        if (month.label.toLocaleLowerCase() === monthName) {
          monthNumber = month.value;
        }
      });

      const dayNumber = dateString.substring(0, dateString.indexOf(" "));
      return {
        dateWeek: dayNumber.length > 1 ? dayNumber : "0" + dayNumber,
        dayWeek: dateString.substring(
          dateString.indexOf("*") + 2,
          dateString.lastIndexOf("*") - 1
        ),
        month: monthNumber,
        id: ids[index],
        prayerTimes: formatSchedule(removeEndLineDots(times)) || "",
        saintsOfDay: removeEndLineDots(day),
      };
    });
    console.log("trimmed", trimmed, ar, dateArray, scheduleSeparated);

    /*
      data: [
        {
          dateWeek: "19", // Выделять из текста "2 июля * Вторник * 2024 г."
          dayWeek: "Воскресенье", // Выделять из текста "2 июля * Вторник * 2024 г."
          id: "firstSunday",
          month: "05", // Выделять из текста "2 июля * Вторник * 2024 г."
          prayerTimes: "", //
          saintsOfDay: ""
        }
      ]
    */
    res.json({
      text: trimmed,
      ar,
      arMatch: dateArray,
      scheduleSeparated,
      data: scheduleSeparated.slice(1), // какой-то костыль  -
    });
  });

  // setTimeout(() => {
  // mammoth
  //   .convertToHtml({
  //     path: __dirname + `/uploads/${fileName}`,
  //   })
  //   .then(function (result) {
  //     var html = result.value; // The generated HTML
  //     var messages = result.messages; // Any messages, such as warnings during conversion
  //     res.send(html);
  //     console.log("html", html);
  //     console.log("messages", messages);
  //   })
  //   .catch(function (error) {
  //     console.error(error);
  //   });
  // }, 2000);
});

app.use("/uploads", express.static("uploads"));
