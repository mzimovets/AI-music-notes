import webpush from "web-push";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { database } from "../index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const VAPID_FILE = path.join(__dir, "../vapid-keys.json");

function getVapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  if (fs.existsSync(VAPID_FILE)) {
    return JSON.parse(fs.readFileSync(VAPID_FILE, "utf8"));
  }
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
  console.log("[push] Сгенерированы VAPID-ключи, сохранены в vapid-keys.json");
  return keys;
}

const vapidKeys = getVapidKeys();
webpush.setVapidDetails(
  "mailto:admin@songs.nevsky-sobor.ru",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

async function sendToAll(payload) {
  database.find({ docType: "push-subscription" }, async (err, subs) => {
    if (err || !subs?.length) return;
    console.log(`[push] Отправляю подписчикам: ${subs.length}`);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          database.remove({ _id: sub._id }, {}, () => {});
        }
      }
    }
  });
}

export async function sendPushToAll(title, body, url = "/", tag = "stack") {
  console.log(`[push] Отправляю уведомление: «${title}»`);
  sendToAll({ title, body, url, tag });
}

export async function sendClosePush(tag) {
  console.log(`[push] Закрываю уведомление: ${tag}`);
  sendToAll({ action: "close", tag });
}

export const pushRoutes = (app) => {
  app.get("/api/push/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post("/api/push/subscribe", (req, res) => {
    const subscription = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ status: "error", message: "Нет endpoint" });
    }
    database.findOne(
      { docType: "push-subscription", "subscription.endpoint": subscription.endpoint },
      (err, existing) => {
        if (existing) return res.json({ status: "ok" });
        database.insert(
          { docType: "push-subscription", subscription, createdAt: Date.now() },
          (insertErr) => {
            if (insertErr) return res.status(500).json({ status: "error" });
            console.log("[push] Новая подписка сохранена");
            res.json({ status: "ok" });
          }
        );
      }
    );
  });

  app.delete("/api/push/subscribe", (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ status: "error" });
    database.remove(
      { docType: "push-subscription", "subscription.endpoint": endpoint },
      {},
      (err, n) => res.json({ status: "ok", removed: n })
    );
  });
};
