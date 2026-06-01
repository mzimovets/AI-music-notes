// v2026-05-29e
import { NextResponse } from "next/server";
import { spawn, execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

const LOG_FILE = "/tmp/git-update.log";
;
const APP_DIR = "/mnt/ssd/AI-music-notes";

function isLinux() {
  try { execSync("which git", { stdio: "ignore" }); return process.platform === "linux"; } catch { return false; }
}

function localSha(): string {
  try { return execSync(`git -C ${APP_DIR} rev-parse HEAD`, { encoding: "utf8" }).trim(); } catch { return ""; }
}

// ── GET — check for update ─────────────────────────────────────────────────────

export async function GET() {
  let processStatus: "idle" | "running" | "restarting" | "done" = "idle";
  let updateProgress = 0;
  let updateStage = "";

  if (existsSync(LOG_FILE)) {
    const { mtimeMs } = require("fs").statSync(LOG_FILE);
    const log = readFileSync(LOG_FILE, "utf8");

    // Во время сборки Next.js на RPi паузы могут быть 10–15 мин — даём больше времени
    const isBuilding = log.includes("BUILDING") && !log.includes("DONE");
    const staleMs = isBuilding ? 20 * 60_000 : 3 * 60_000;
    const stale = Date.now() - mtimeMs > staleMs;

    // Явные признаки ошибки git pull (нет интернета, нет доступа и т.д.)
    const hasPullError =
      log.includes("PULLING") &&
      !log.includes("INSTALLING") &&
      (log.includes("fatal:") || log.includes("error:") || log.includes("Could not") || stale);

    if (hasPullError) {
      // git pull упал — показываем ошибку, не крутим спиннер
      processStatus = "idle"; updateProgress = 0; updateStage = "";
    } else if (stale && !log.includes("DONE")) {
      // Устаревший лог без DONE — считаем idle
    } else if (log.includes("DONE")) {
      processStatus = "done"; updateProgress = 100; updateStage = "Готово";
    } else if (log.includes("RESTARTING")) {
      processStatus = "restarting"; updateProgress = 90; updateStage = "Перезапуск сервисов";
    } else if (log.includes("BUILDING")) {
      if (log.includes("Route (app)") || log.includes("✓ Compiled")) {
        processStatus = "running"; updateProgress = 85; updateStage = "Финализация сборки";
      } else if (log.includes("Creating an optimized") || log.includes("▲ Next.js")) {
        processStatus = "running"; updateProgress = 70; updateStage = "Сборка приложения";
      } else {
        processStatus = "running"; updateProgress = 60; updateStage = "Сборка приложения";
      }
    } else if (log.includes("INSTALLING")) {
      processStatus = "running"; updateProgress = 35; updateStage = "Установка зависимостей";
    } else if (log.includes("PULLING")) {
      processStatus = "running"; updateProgress = 15; updateStage = "Загрузка кода";
    } else if (log.includes("START")) {
      processStatus = "running"; updateProgress = 5; updateStage = "Запуск";
    }
  }

  if (!isLinux()) {
    return NextResponse.json({
      processStatus, updateProgress, updateStage,
      hasUpdate: true,
      remote: {
        sha: "abc1234",
        message: "feat: добавить кнопку обновления прошивки через Git",
        date: new Date(Date.now() - 3600_000).toISOString(),
      },
      localSha: "def5678",
    });
  }

  // Используем git напрямую — без GitHub API, без rate limit
  try {
    // git fetch обновляет origin/main локально (~1-2s, нужен интернет)
    execSync(`git -C ${APP_DIR} fetch origin main --quiet`, { timeout: 15_000 });
  } catch {
    return NextResponse.json({
      processStatus, updateProgress, updateStage,
      error: "Нет соединения с репозиторием",
    }, { status: 500 });
  }

  try {
    const sha = localSha();
    const remoteSha = execSync(`git -C ${APP_DIR} rev-parse origin/main`, { encoding: "utf8" }).trim();

    // Данные последнего коммита на origin/main
    const logLine = execSync(
      `git -C ${APP_DIR} log origin/main -1 --pretty=format:"%s|%aI"`,
      { encoding: "utf8" }
    ).trim();
    const [message = "", date = ""] = logLine.split("|");

    // До 10 последних коммитов на origin/main
    const logLines = execSync(
      `git -C ${APP_DIR} log origin/main -10 --pretty=format:"%h|%s|%aI"`,
      { encoding: "utf8" }
    ).trim().split("\n").filter(Boolean);
    const recentCommits = logLines.map((line) => {
      const [s, m, d] = line.split("|");
      return { sha: s ?? "", message: m ?? "", date: d ?? "" };
    });

    return NextResponse.json({
      processStatus, updateProgress, updateStage,
      hasUpdate: !!remoteSha && remoteSha !== sha,
      remote: { sha: remoteSha.slice(0, 7), message, date },
      localSha: sha.slice(0, 7),
      recentCommits,
    });
  } catch {
    return NextResponse.json({ processStatus, updateProgress, updateStage, error: "Ошибка чтения git" }, { status: 500 });
  }
}

// ── POST — start update ────────────────────────────────────────────────────────

export async function POST() {
  const child = spawn(
    "bash",
    [
      "-c",
      `export NVM_DIR="/home/pi/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && \
echo "START $(date)" > ${LOG_FILE} && \
cd ${APP_DIR} && \
echo "PULLING" >> ${LOG_FILE} && \
git pull origin main >> ${LOG_FILE} 2>&1 && \
echo "INSTALLING" >> ${LOG_FILE} && \
NODE_ENV=development npm install >> ${LOG_FILE} 2>&1 && \
echo "BUILDING" >> ${LOG_FILE} && \
npm run build >> ${LOG_FILE} 2>&1 && \
echo "RESTARTING" >> ${LOG_FILE} && \
sudo systemctl restart music-backend >> ${LOG_FILE} 2>&1 && \
echo "DONE" >> ${LOG_FILE} && \
sleep 2 && \
sudo systemctl restart music-frontend >> ${LOG_FILE} 2>&1`,
    ],
    { detached: true, stdio: "ignore" }
  );
  child.unref();

  return NextResponse.json({ ok: true });
}
