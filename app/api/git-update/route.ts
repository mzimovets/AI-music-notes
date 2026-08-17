// v2026-05-29e
import { NextResponse } from "next/server";
import { spawn, execSync } from "child_process";
import { readFileSync, existsSync, unlinkSync } from "fs";

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

/**
 * Последние строки журнала обновления — то, что реально печатают git и npm.
 *
 * Без них застрявший процент ничего не объясняет: «5%» одинаково выглядит и
 * когда плата не достучалась до GitHub, и когда не хватило места на диске.
 * Шум вроде полосы загрузки npm выкидываем, иначе за ним не видно ошибок.
 */
function readLogTail(limit = 40): string[] {
  try {
    return readFileSync(LOG_FILE, "utf8")
      .split("\n")
      .map((line) => line.replace(/\r.*$/, "").trimEnd())
      .filter((line) => line && !/^[\s|/\\\-=*]+$/.test(line))
      .slice(-limit);
  } catch {
    return [];
  }
}

/**
 * Человеческая причина остановки вместо «застряло на 5%».
 *
 * Разбираем то, что печатают git и npm: чаще всего у платы просто нет
 * интернета, и по одной цифре процента это не отличить от любой другой беды.
 */
function explainFailure(log: string, stale: boolean): { reason: string; fix: string } {
  if (/Could not resolve host|Temporary failure in name resolution/.test(log))
    return {
      reason: "Плата не видит github.com: нет интернета или не работает DNS",
      fix: "Подключите плату к Wi-Fi с интернетом — вкладка «Сеть» в этом окне. Если сеть уже подключена, проверьте, что в ней есть интернет: внешний USB-адаптер платы капризен и в сетях с фильтрацией по MAC требует разрешить адрес 78:20:51:45:8c:7c.",
    };
  if (/Authentication failed|could not read Username|Permission denied \(publickey/.test(log))
    return {
      reason: "GitHub не пустил: не приняты логин и пароль или ключ доступа",
      fix: "Зайдите на плату по SSH и выполните git pull вручную — git скажет, чего именно ему не хватает. Возможно, истёк токен доступа.",
    };
  if (/no space left on device|ENOSPC/i.test(log))
    return {
      reason: "На диске платы закончилось место",
      fix: "Освободите место: на плате в папке приложения выполните npm run cleanup — он удалит неиспользуемые PDF и старые записи. Загруженность диска видна на вкладке «Система».",
    };
  if (/Your local changes|would be overwritten|Merge conflict/.test(log))
    return {
      reason: "На плате есть свои правки, и обновление не ложится поверх них",
      fix: "Зайдите на плату по SSH и выполните git checkout -- . в папке приложения, чтобы отменить местные правки, затем повторите обновление. Если правки нужны — сохраните их заранее.",
    };
  if (/unable to access|Connection timed out|Failed to connect/.test(log))
    return {
      reason: "Не удалось достучаться до репозитория",
      fix: "Проверьте интернет на плате и повторите. Если сеть в порядке, GitHub может быть временно недоступен — попробуйте через несколько минут.",
    };
  if (/npm ERR!/.test(log))
    return {
      reason: "Не установились зависимости",
      fix: "Чаще всего виноват оборвавшийся интернет. Проверьте связь и повторите обновление. Если повторяется — на плате выполните npm install и посмотрите полную ошибку.",
    };
  if (/sudo:|systemctl/.test(log) && /error|failed/i.test(log))
    return {
      reason: "Код обновился, но службы не перезапустились",
      fix: "Перезапустите вручную на плате: sudo systemctl restart music-backend music-frontend. Если не поможет — перезагрузите плату.",
    };

  const line = log
    .split("\n")
    .reverse()
    .find((l) => /fatal:|error:|npm ERR!/.test(l));
  if (line)
    return {
      reason: line.replace(/^(fatal|error|npm ERR!):?\s*/i, "").trim(),
      fix: "Разверните подробности ниже и покажите последние строки — по ним будет понятно, что делать дальше.",
    };

  return stale
    ? {
        reason: "Обновление остановилось и больше ничего не пишет в журнал",
        fix: "Скорее всего оборвалась связь во время загрузки. Запустите обновление заново. Если плата с тех пор не отвечает — перезагрузите её.",
      }
    : {
        reason: "Обновление прервалось",
        fix: "Запустите обновление заново. Если повторится — разверните подробности ниже.",
      };
}

export async function GET() {
  let processStatus: "idle" | "running" | "restarting" | "done" = "idle";
  let updateProgress = 0;
  let updateStage = "";
  let updateError = "";
  let updateFix = "";
  const logTail = readLogTail();

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

    if (log.includes("FAILED")) {
      // Сценарий сам отметил провал — причину берём из его же вывода
      processStatus = "idle"; updateProgress = 0; updateStage = "";
      ({ reason: updateError, fix: updateFix } = explainFailure(log, stale));
    } else if (hasPullError) {
      // git pull упал — показываем ошибку, не крутим спиннер
      processStatus = "idle"; updateProgress = 0; updateStage = "";
      ({ reason: updateError, fix: updateFix } = explainFailure(log, stale));
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
      processStatus, updateProgress, updateStage, updateError, updateFix, logTail,
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
      processStatus, updateProgress, updateStage, updateError, updateFix, logTail,
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

    const hasUpdate = !!remoteSha && remoteSha !== sha;

    /**
     * Прошлая неудача перестаёт что-либо значить, когда обновлять уже нечего.
     *
     * Журнал обновления лежит в файле и переживает любое успешное обновление,
     * сделанное в обход кнопки — через deploy.sh или git pull руками. Без этой
     * проверки старая запись висела бы на экране и после того, как плата уже
     * догнала репозиторий: человек всё исправил, а приложение продолжает
     * жаловаться. Заодно убираем сам файл, чтобы запись не всплыла снова.
     *
     * Отметку об успехе не трогаем: её ждёт опрос после нажатия кнопки, и
     * стоит убрать файл раньше времени — опрос не дождётся и зациклится.
     */
    if (!hasUpdate && updateError) {
      updateError = "";
      updateFix = "";
      logTail.length = 0;
      try { unlinkSync(LOG_FILE); } catch {}
    }

    return NextResponse.json({
      processStatus, updateProgress, updateStage, updateError, updateFix, logTail,
      hasUpdate,
      remote: { sha: remoteSha.slice(0, 7), message, date },
      localSha: sha.slice(0, 7),
      recentCommits,
    });
  } catch {
    return NextResponse.json({ processStatus, updateProgress, updateStage, updateError, updateFix, logTail, error: "Ошибка чтения git" }, { status: 500 });
  }
}

// ── POST — start update ────────────────────────────────────────────────────────

export async function POST() {
  const child = spawn(
    "bash",
    [
      "-c",
      // Журнал начинаем до всего остального, иначе при неудаче с nvm не будет
      // ни строчки и снаружи это выглядит как «ничего не происходит».
      // Вся цепочка обёрнута в скобки: любой сбой внутри дописывает FAILED,
      // а не обрывается молча — иначе процент замирает и не объясняет причину
      `echo "START $(date)" > ${LOG_FILE}
export NVM_DIR="/home/pi/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
{
  cd ${APP_DIR} &&
  echo "PULLING" >> ${LOG_FILE} &&
  { git checkout -- package-lock.json public/sw.js server/package-lock.json server/node_modules/.package-lock.json 2>/dev/null || true; } &&
  git pull origin main >> ${LOG_FILE} 2>&1 &&
  echo "INSTALLING" >> ${LOG_FILE} &&
  NODE_ENV=development npm install >> ${LOG_FILE} 2>&1 &&
  echo "BUILDING" >> ${LOG_FILE} &&
  npm run build >> ${LOG_FILE} 2>&1 &&
  echo "RESTARTING" >> ${LOG_FILE} &&
  sudo systemctl restart music-backend >> ${LOG_FILE} 2>&1 &&
  echo "DONE" >> ${LOG_FILE} &&
  sleep 2 &&
  sudo systemctl restart music-frontend >> ${LOG_FILE} 2>&1
} || echo "FAILED" >> ${LOG_FILE}`,
    ],
    { detached: true, stdio: "ignore" }
  );
  child.unref();

  return NextResponse.json({ ok: true });
}
