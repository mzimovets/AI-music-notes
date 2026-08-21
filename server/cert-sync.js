/**
 * Забирает сертификат с интернет-сервера и ставит его на плату.
 *
 * До этого он был единственным ручным шагом во всей цепочке продления: на
 * сервере сертификат обновляется сам и сам разъезжается по сайтам, а на плату
 * его переносили руками. Забытый перенос означает, что в какой-то день планшеты
 * перестают доверять плате — и обнаруживается это обычно не дома, а на месте.
 *
 * Ключ отдельный от синхронизации данных (CERT_API_KEY): через него отдаётся
 * закрытый ключ сертификата всех доменов, и его утечка не должна стоить ещё и
 * доступа к нотам. Сменить его можно отдельно.
 *
 * Установка требует прав root — запись в /etc/ssl и перезапуск nginx идут через
 * sudo. Нужные разрешения прописываются один раз, см. README.
 */

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";

const CERT_DIR = process.env.BOARD_CERT_DIR || "/etc/ssl/nevsky-songs";
const CERT_FILE = path.join(CERT_DIR, "server.crt");
const KEY_FILE = path.join(CERT_DIR, "server.key");

/** Куда пишем последнее состояние — его показывает приложение */
const STATE_FILE = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "cert-state.json",
);

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeState(patch) {
  try {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ ...readState(), ...patch }, null, 2),
    );
  } catch {}
}

/** Отпечаток того, что сейчас лежит на плате */
function localFingerprint() {
  try {
    return crypto
      .createHash("sha256")
      .update(fs.readFileSync(CERT_FILE, "utf8"))
      .digest("hex");
  } catch {
    return null;
  }
}

/** До какого числа действует сертификат на плате */
export function localExpiry() {
  try {
    const out = execFileSync(
      "openssl",
      ["x509", "-enddate", "-noout", "-in", CERT_FILE],
      // Ругань openssl на отсутствующий файл в журнале не нужна: на плате без
      // сертификата это обычное состояние, а не происшествие
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const raw = out.split("=")[1]?.trim();
    return raw ? new Date(raw).getTime() || null : null;
  } catch {
    return null;
  }
}

/** Состояние для показа в приложении */
export function certStatus() {
  const expiresAt = localExpiry();
  return {
    ...readState(),
    expiresAt,
    daysLeft:
      expiresAt === null
        ? null
        : Math.floor((expiresAt - Date.now()) / 86_400_000),
  };
}

/**
 * Кладёт новые файлы на место и перезапускает nginx.
 *
 * Пишем во временную папку и переносим одной командой: если оборвётся на
 * середине, лучше остаться со старым рабочим сертификатом, чем с половиной
 * нового. Проверка nginx перед перезапуском — по той же причине.
 */
function install(fullchain, privkey) {
  const tmpCert = path.join(os.tmpdir(), "nevsky-server.crt");
  const tmpKey = path.join(os.tmpdir(), "nevsky-server.key");

  fs.writeFileSync(tmpCert, fullchain, { mode: 0o644 });
  fs.writeFileSync(tmpKey, privkey, { mode: 0o600 });

  execFileSync("sudo", ["mkdir", "-p", CERT_DIR]);
  execFileSync("sudo", ["cp", tmpCert, CERT_FILE]);
  execFileSync("sudo", ["cp", tmpKey, KEY_FILE]);
  execFileSync("sudo", ["chmod", "600", KEY_FILE]);

  // Проверяем настройки до перезапуска: с битым сертификатом nginx не поднимется
  execFileSync("sudo", ["nginx", "-t"]);
  execFileSync("sudo", ["systemctl", "reload", "nginx"]);

  fs.unlinkSync(tmpCert);
  fs.unlinkSync(tmpKey);
}

export async function syncCertificate() {
  const url = process.env.SYNC_MASTER_URL;
  const key = process.env.CERT_API_KEY;

  if (!url || !key) return; // не настроено — молча пропускаем

  try {
    const res = await fetch(`${url}/api/sync/cert`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      writeState({
        lastCheckAt: Date.now(),
        error: `Сервер ответил ${res.status}`,
      });
      return;
    }

    const { fullchain, privkey, fingerprint } = await res.json();
    if (!fullchain || !privkey) {
      writeState({ lastCheckAt: Date.now(), error: "Сервер вернул пустой сертификат" });
      return;
    }

    // Тот же самый — трогать nginx незачем
    if (fingerprint && fingerprint === localFingerprint()) {
      writeState({ lastCheckAt: Date.now(), error: null });
      return;
    }

    install(fullchain, privkey);
    writeState({
      lastCheckAt: Date.now(),
      lastUpdatedAt: Date.now(),
      fingerprint,
      error: null,
    });
    console.log("[cert] Сертификат обновлён, nginx перезапущен");
  } catch (e) {
    // Без интернета это обычное дело, а не поломка: запишем и попробуем позже
    writeState({ lastCheckAt: Date.now(), error: e.message });
  }
}
