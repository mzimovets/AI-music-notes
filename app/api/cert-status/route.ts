import { NextResponse } from "next/server";
import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";

/**
 * Состояние сертификата на плате — для показа в окне платы.
 *
 * Понадобилось после истории, когда сертификат просрочился и узналось это
 * письмом от хостинга спустя полтора месяца. Пока срок нигде не показывался,
 * заметить отставание было нечем.
 *
 * Читаем сам файл сертификата, а не наши записи о нём: записи могут отстать
 * от действительности, а срок в сертификате — нет.
 */

const CERT_FILE =
  process.env.BOARD_CERT_FILE || "/etc/ssl/nevsky-songs/server.crt";

/** Куда cert-sync.js пишет ход последней проверки */
const STATE_FILE = path.join(process.cwd(), "server", "cert-state.json");

function expiryOf(file: string): number | null {
  try {
    const out = execFileSync(
      "openssl",
      ["x509", "-enddate", "-noout", "-in", file],
      // Ругань на отсутствующий файл в журнале не нужна: на плате без
      // сертификата это обычное состояние, а не происшествие
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const raw = out.split("=")[1]?.trim();
    return raw ? new Date(raw).getTime() || null : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const expiresAt = existsSync(CERT_FILE) ? expiryOf(CERT_FILE) : null;

  let state: Record<string, unknown> = {};
  try {
    state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    // Файла нет — значит забор сертификата ещё ни разу не отрабатывал
  }

  return NextResponse.json({
    present: expiresAt !== null,
    expiresAt,
    daysLeft:
      expiresAt === null
        ? null
        : Math.floor((expiresAt - Date.now()) / 86_400_000),
    lastCheckAt: state.lastCheckAt ?? null,
    lastUpdatedAt: state.lastUpdatedAt ?? null,
    error: state.error ?? null,
    // Сайт, у которого срок кончается раньше всех: сторож обходит их, когда у
    // платы есть интернет. Нужен потому, что файл на диске и то, что реально
    // отдаётся браузеру, однажды разошлись на полтора месяца
    worstSite: state.worstSite ?? null,
    sitesCheckedAt: state.sitesCheckedAt ?? null,
  });
}

/**
 * Проверить сертификат прямо сейчас — для кнопки «Обновить» в окне платы.
 *
 * Сама проверка живёт в бэкенде (server/cert-sync.js): там загружены ключи
 * доступа к мастеру, которых у этого процесса нет. Обход идёт раз в час, а
 * неудачная попытка остаётся записанной в файле состояния до следующей —
 * человек успевает подключить плату к интернету и хочет увидеть итог сразу,
 * а не гадать, устарело сообщение или нет.
 */
export async function POST() {
  const BACKEND = process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${BACKEND}/api/cert-refresh`, {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
    });
    return NextResponse.json(await res.json(), { status: res.ok ? 200 : 502 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message) }, { status: 500 });
  }
}
