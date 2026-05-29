import { NextResponse } from "next/server";
import { spawn, execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

const LOG_FILE = "/tmp/git-update.log";
const REPO = "mzimovets/AI-music-notes";
const APP_DIR = "/mnt/ssd/AI-music-notes";

// ── Helpers ────────────────────────────────────────────────────────────────────

function isLinux() {
  try { execSync("which git", { stdio: "ignore" }); return process.platform === "linux"; } catch { return false; }
}

function localSha(): string {
  try { return execSync(`git -C ${APP_DIR} rev-parse HEAD`, { encoding: "utf8" }).trim(); } catch { return ""; }
}

// ── GET — check for update ─────────────────────────────────────────────────────

export async function GET() {
  // Update process status + progress
  let processStatus: "idle" | "running" | "restarting" | "done" = "idle";
  let updateProgress = 0;
  let updateStage = "";
  if (existsSync(LOG_FILE)) {
    const log = readFileSync(LOG_FILE, "utf8");
    if (log.includes("DONE")) {
      processStatus = "done"; updateProgress = 100; updateStage = "Готово";
    } else if (log.includes("RESTARTING")) {
      processStatus = "restarting"; updateProgress = 95; updateStage = "Перезапуск сервисов";
    } else if (log.includes("Route (app)") || log.includes("✓ Compiled")) {
      processStatus = "running"; updateProgress = 85; updateStage = "Финализация сборки";
    } else if (log.includes("Creating an optimized") || log.includes("▲ Next.js")) {
      processStatus = "running"; updateProgress = 55; updateStage = "Сборка приложения";
    } else if (log.includes("audited") || log.includes("up to date")) {
      processStatus = "running"; updateProgress = 35; updateStage = "Установка зависимостей";
    } else if (log.includes("From https://github") || log.includes("Already up to date")) {
      processStatus = "running"; updateProgress = 15; updateStage = "Загрузка кода";
    } else if (log.includes("START")) {
      processStatus = "running"; updateProgress = 5; updateStage = "Запуск";
    }
  }

  // Mock for macOS dev
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

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/commits/main`, {
      headers: { "Accept": "application/vnd.github.v3+json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ processStatus, error: "GitHub API недоступен" }, { status: 502 });
    }

    const data = await res.json();
    const remoteSha: string = data.sha ?? "";
    const message: string = data.commit?.message ?? "";
    const date: string = data.commit?.author?.date ?? data.commit?.committer?.date ?? "";
    const sha = localSha();

    return NextResponse.json({
      processStatus, updateProgress, updateStage,
      hasUpdate: !!remoteSha && remoteSha !== sha,
      remote: { sha: remoteSha.slice(0, 7), message, date },
      localSha: sha.slice(0, 7),
    });
  } catch (err: any) {
    return NextResponse.json({ processStatus, updateProgress, updateStage, error: String(err?.message) }, { status: 500 });
  }
}

// ── POST — start update ────────────────────────────────────────────────────────

export async function POST() {
  const child = spawn(
    "bash",
    [
      "-c",
      `echo "START $(date)" > ${LOG_FILE} && \
cd ${APP_DIR} && \
git pull origin main >> ${LOG_FILE} 2>&1 && \
npm install --omit=dev >> ${LOG_FILE} 2>&1 && \
npm run build >> ${LOG_FILE} 2>&1 && \
echo "RESTARTING" >> ${LOG_FILE} && \
sudo systemctl restart music-frontend music-backend >> ${LOG_FILE} 2>&1 && \
echo "DONE" >> ${LOG_FILE}`,
    ],
    { detached: true, stdio: "ignore" }
  );
  child.unref();

  return NextResponse.json({ ok: true });
}
