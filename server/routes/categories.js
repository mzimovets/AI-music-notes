import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { database } from "../index.js";
import { pushLocalChangeToRemote } from "../push-remote.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

const CATEGORIES_ID = "categories";

// Стартовый набор — записывается в базу при первом обращении,
// чтобы на чистой установке категории не пропали.
const DEFAULT_ITEMS = [
  { key: "spiritual_chants", name: "Духовные канты", image: "/songs/kants.jpg" },
  { key: "easter", name: "Пасха", image: "/songs/pasha.jpg" },
  { key: "carols", name: "Колядки", image: "/songs/carols.jpg" },
  { key: "folk", name: "Народные", image: "/songs/narod.jpg" },
  { key: "soviet", name: "Советские", image: "/songs/soviet.jpg" },
  { key: "military", name: "Военные", image: "/songs/pobeda.jpg" },
  { key: "childrens", name: "Детские", image: "/songs/children.jpg" },
  { key: "other", name: "Другое", image: "/songs/other.jpg" },
];

const normalizeItems = (items) => {
  if (!Array.isArray(items)) return null;

  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = typeof item?.key === "string" ? item.key.trim() : "";
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    if (!key || !name || seen.has(key)) return null;

    seen.add(key);
    result.push({
      key,
      name,
      image: typeof item?.image === "string" ? item.image : "",
    });
  }

  return result;
};

export const categoriesRoutes = (app) => {
  app.get("/categories", (req, res) => {
    database.findOne({ _id: CATEGORIES_ID }, (err, doc) => {
      if (err) console.log("err", err);

      if (doc?.items) {
        res.json({ status: "ok", items: doc.items });
        return;
      }

      const seed = {
        _id: CATEGORIES_ID,
        docType: "categories",
        items: DEFAULT_ITEMS,
        updatedAt: Date.now(),
      };
      database.insert(seed, (insertErr) => {
        if (insertErr) console.log("err", insertErr);
        console.log("seeded categories");
        res.json({ status: "ok", items: seed.items });
      });
    });
  });

  app.put("/categories", (req, res) => {
    const items = normalizeItems(req.body?.items);
    if (!items) {
      res.status(400).json({ status: "error", message: "Некорректный список категорий" });
      return;
    }

    const doc = {
      _id: CATEGORIES_ID,
      docType: "categories",
      items,
      updatedAt: Date.now(),
    };

    // Узнаём прежние картинки до перезаписи — при замене картинки категории
    // старый загруженный файл иначе остаётся сиротой в uploads навсегда
    // (та же беда, что и с заменой файла ноты, только для картинок разделов)
    database.findOne({ _id: CATEGORIES_ID }, (findOldErr, oldDoc) => {
      const oldImages = !findOldErr && Array.isArray(oldDoc?.items)
        ? oldDoc.items.map((i) => i.image).filter((img) => typeof img === "string" && img.startsWith("/uploads/"))
        : [];
      const newImages = new Set(items.map((i) => i.image));

      database.update({ _id: CATEGORIES_ID }, doc, { upsert: true }, (err) => {
        console.log("updating categories:", items.length);
        if (err) console.log("err", err);
        res.json({ status: "ok", items });
        if (!err) pushLocalChangeToRemote(doc);

        if (!err) {
          for (const oldImage of oldImages) {
            if (newImages.has(oldImage)) continue;
            const filename = oldImage.replace(/^\/uploads\//, "");
            fs.unlink(path.join(UPLOADS_DIR, filename), (unlinkErr) => {
              if (!unlinkErr) console.log(`Удалена старая картинка раздела: ${filename}`);
            });
          }
        }
      });
    });
  });
};
