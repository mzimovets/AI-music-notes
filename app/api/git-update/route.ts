// v2026-05-29e
import { NextResponse } from "next/server";
import { spawn, execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

const LOG_FILE = "/tmp/git-update.log";
const REPO = "mzimovets/AI-music-notes";
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
    const log = readFileSync(LOG_FILE, "utf8");
    if (log.includes("DONE")) {
      processStatus = "done"; updateProgress = 100; updateStage = "Готово";
    } else if (log.includes("RESTARTING")) {
      processStatus = "restarting"; updateProgress = 90; updateStage = "Перезапуск сервисов";
    } else if (log.includes("BUILDING")) {
      // Inside build — detect sub-stages
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

  try {
    const headers: Record<string, string> = { "Accept": "application/vnd.github.v3+json" };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

    const [latestRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${REPO}/commits/main`, { headers, next: { revalidate: 0 } }),
      fetch(`https://api.github.com/repos/${REPO}/commits?per_page=10`, { headers, next: { revalidate: 0 } }),
    ]);

    if (!latestRes.ok) {
      return NextResponse.json({ processStatus, updateProgress, updateStage, error: "GitHub API недоступен" }, { status: 502 });
    }

    const data = await latestRes.json();
    const remoteSha: string = data.sha ?? "";
    const message: string = data.commit?.message ?? "";
    const date: string = data.commit?.author?.date ?? data.commit?.committer?.date ?? "";
    const sha = localSha();

    let recentCommits: { sha: string; message: string; date: string }[] = [];
    if (commitsRes.ok) {
      const commits = await commitsRes.json();
      recentCommits = (Array.isArray(commits) ? commits : []).slice(0, 10).map((c: any) => ({
        sha: (c.sha ?? "").slice(0, 7),
        message: c.commit?.message ?? "",
        date: c.commit?.author?.date ?? c.commit?.committer?.date ?? "",
      }));
    }

    return NextResponse.json({
      processStatus, updateProgress, updateStage,
      hasUpdate: !!remoteSha && remoteSha !== sha,
      remote: { sha: remoteSha.slice(0, 7), message, date },
      localSha: sha.slice(0, 7),
      recentCommits,
    });
  } catch {
    return NextResponse.json({ processStatus, updateProgress, updateStage, error: "Нет соединения с GitHub" }, { status: 500 });
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
sudo systemctl restart music-frontend >> ${LOG_FILE} 2>&1 && \
sudo systemctl restart music-backend >> ${LOG_FILE} 2>&1 && \
echo "DONE" >> ${LOG_FILE}`,
    ],
    { detached: true, stdio: "ignore" }
  );
  child.unref();

  return NextResponse.json({ ok: true });
}
