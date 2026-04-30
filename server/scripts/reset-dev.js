#!/usr/bin/env node
// Сбрасывает БД и uploads/ до чистого состояния (только для разработки).
// Перед сбросом создаёт бэкап в backups/pre-reset_<timestamp>/
//
// Использование: node scripts/reset-dev.js [--force]
// --force  Не спрашивать подтверждения

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..");

const IS_PROD = process.env.NODE_ENV === "production";
if (IS_PROD) {
  console.error("[reset-dev] ОТКАЗ: нельзя запускать в production (NODE_ENV=production)");
  process.exit(1);
}

const FORCE = process.argv.includes("--force");

async function confirm(question) {
  if (FORCE) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === "yes");
    });
  });
}

const ok = await confirm(
  "ВНИМАНИЕ: database.db и uploads/ будут очищены. Продолжить? (yes/no): "
);

if (!ok) {
  console.log("[reset-dev] Отменено.");
  process.exit(0);
}

// Бэкап перед сбросом
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupDir = path.join(SERVER_DIR, "backups", `pre-reset_${timestamp}`);
fs.mkdirSync(backupDir, { recursive: true });

const dbPath = path.join(SERVER_DIR, "database.db");
const uploadsPath = path.join(SERVER_DIR, "uploads");

if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, path.join(backupDir, "database.db"));
  fs.unlinkSync(dbPath);
  console.log("[reset-dev] database.db удалён (бэкап сохранён)");
}

if (fs.existsSync(uploadsPath)) {
  execSync(`cp -r "${uploadsPath}" "${path.join(backupDir, "uploads")}"`);
  fs.rmSync(uploadsPath, { recursive: true, force: true });
  fs.mkdirSync(uploadsPath);
  console.log("[reset-dev] uploads/ очищен (бэкап сохранён)");
}

const syncStatePath = path.join(SERVER_DIR, "sync-state.json");
if (fs.existsSync(syncStatePath)) {
  fs.unlinkSync(syncStatePath);
  console.log("[reset-dev] sync-state.json удалён");
}

console.log(`[reset-dev] Бэкап перед сбросом: ${backupDir}`);
console.log("[reset-dev] Готово. Запустите сервер — БД будет создана с дефолтными пользователями.");
