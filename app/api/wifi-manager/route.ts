import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ── Platform detection ─────────────────────────────────────────────────────────

/** true — Linux RPi с wpa_supplicant; false — мок (macOS / dev) */
async function isLinux(): Promise<boolean> {
  try {
    await execAsync("which iwgetid", { timeout: 2_000 });
    return true;
  } catch {
    return false;
  }
}

// ── Mock (macOS / dev) ─────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var _wifiMockState:
    | { ssid: string; ip: string; connected: boolean; apDevices: number; apActive: boolean }
    | undefined;
}
if (!globalThis._wifiMockState) {
  globalThis._wifiMockState = {
    ssid: "HomeNetwork",
    ip: "192.168.1.200",
    connected: true,
    apDevices: 3,
    apActive: true,
  };
}

const MOCK_NETWORKS = [
  { ssid: "HomeNetwork",  signal: 90, security: "WPA2", inUse: true  },
  { ssid: "OfficeWiFi",  signal: 72, security: "WPA2", inUse: false },
  { ssid: "CafeGuest",   signal: 55, security: "—",    inUse: false },
  { ssid: "Neighbor_5G", signal: 38, security: "WPA3", inUse: false },
  { ssid: "IoT_Hub",     signal: 21, security: "WPA2", inUse: false },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

async function run(cmd: string, timeoutMs = 15_000): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: timeoutMs });
    return stdout.trim();
  } catch (err: any) {
    return err?.stdout?.trim() ?? "";
  }
}

/** Количество устройств на wlan0 AP */
async function getApDevices(): Promise<number> {
  const out = await run("iw dev wlan0 station dump 2>/dev/null | grep -c '^Station'");
  const n = parseInt(out);
  return isNaN(n) ? 0 : n;
}

/** wlan0 AP активна? */
async function getApActive(): Promise<boolean> {
  const out = await run("nmcli -t -f GENERAL.STATE con show pi-hotspot 2>/dev/null");
  return out.includes("activated");
}

/** Статус wlan1 через ip / iwgetid (не nmcli — он не управляет wlan1) */
async function getWlan1Status(): Promise<{ ssid: string; ip: string; connected: boolean }> {
  const ip = await run(
    "ip -4 addr show wlan1 scope global | grep -oP '(?<=inet )\\d+\\.\\d+\\.\\d+\\.\\d+' | head -1"
  );
  const ssid = await run("iwgetid wlan1 -r 2>/dev/null");
  return {
    ip: ip || "—",
    ssid: ssid || "—",
    connected: !!ip && !!ssid,
  };
}

/** Сканирование через wpa_cli (wlan1 управляется wpa_supplicant) */
async function scanWlan1(): Promise<
  { ssid: string; signal: number; security: string; inUse: boolean }[]
> {
  const currentSsid = await run("iwgetid wlan1 -r 2>/dev/null");

  // Запустить сканирование
  await run("sudo wpa_cli -i wlan1 scan");
  await new Promise((r) => setTimeout(r, 2500));

  const out = await run("sudo wpa_cli -i wlan1 scan_results");
  const networks: { ssid: string; signal: number; security: string; inUse: boolean }[] = [];
  const seen = new Set<string>();

  for (const line of out.split("\n").slice(1)) {
    // Формат: bssid \t freq \t signal_dbm \t flags \t ssid
    const parts = line.split("\t");
    if (parts.length < 5) continue;
    const [, , signalStr, flags, ssid] = parts;
    if (!ssid || ssid.includes("\\x00") || seen.has(ssid)) continue;
    seen.add(ssid);

    // dBm → проценты (приблизительно)
    const dBm = parseInt(signalStr) || -100;
    const signal = Math.max(0, Math.min(100, Math.round((dBm + 100) * 2)));

    const security = flags.includes("WPA2")
      ? "WPA2"
      : flags.includes("WPA")
      ? "WPA"
      : flags.includes("WEP")
      ? "WEP"
      : "—";

    networks.push({ ssid, signal, security, inUse: ssid === currentSsid });
  }

  return networks.sort((a, b) => b.signal - a.signal);
}

/** Подключение wlan1 через wpa_supplicant */
async function connectWlan1(
  ssid: string,
  password?: string
): Promise<{ ok: boolean; error?: string }> {
  const configPath = "/etc/wpa_supplicant/wpa_supplicant-wlan1.conf";

  // 1. Читаем текущий конфиг и удаляем старую запись для этого SSID
  const current = await run(`cat ${configPath} 2>/dev/null`);
  const escapedSsid = ssid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/"/g, '\\"');
  const cleaned = current
    .replace(new RegExp(`network=\\{[^}]*ssid="${escapedSsid}"[^}]*\\}`, "gs"), "")
    .trim();

  // 2. Формируем новый блок сети
  let newBlock: string;
  const safeSsid = ssid.replace(/"/g, '\\"');
  const safePass = (password ?? "").replace(/"/g, '\\"');

  if (password) {
    const raw = await run(`wpa_passphrase "${safeSsid}" "${safePass}"`);
    // Убираем строку с паролем в открытом виде
    newBlock = raw.replace(/^\s*#psk=.*$/m, "").trim();
  } else {
    newBlock = `network={\n\tssid="${safeSsid}"\n\tkey_mgmt=NONE\n}`;
  }

  // 3. Записываем обновлённый конфиг
  const newConfig = `${cleaned}\n\n${newBlock}\n`;
  // Используем tee через base64 чтобы избежать проблем со спецсимволами
  const b64 = Buffer.from(newConfig).toString("base64");
  await run(`echo "${b64}" | base64 -d | sudo tee ${configPath} > /dev/null`);

  // 4. Перезагружаем конфиг wpa_supplicant
  await run("sudo wpa_cli -i wlan1 reconfigure");

  // 5. Ждём подключения (до 15 сек)
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const state = await run(
      "sudo wpa_cli -i wlan1 status | grep wpa_state | cut -d= -f2"
    );
    if (state === "COMPLETED") {
      // 6. Восстанавливаем статический ARP для шлюза (Keenetic)
      await run("sudo arp -i wlan1 -s 192.168.1.1 50:ff:20:98:78:17").catch(() => {});
      return { ok: true };
    }
  }

  return { ok: false, error: "Не удалось подключиться. Проверьте пароль." };
}

// ── GET — статус ───────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const linux = await isLinux();

    if (!linux) {
      const s = globalThis._wifiMockState!;
      return NextResponse.json({ ok: true, mode: "client" as const, ...s, _mock: true });
    }

    const [wlan1, apActive, apDevices] = await Promise.all([
      getWlan1Status(),
      getApActive(),
      getApDevices(),
    ]);

    return NextResponse.json({
      ok: true,
      // wlan1 клиент
      mode: "client" as const,
      ssid: wlan1.ssid,
      ip: wlan1.ip,
      connected: wlan1.connected,
      // wlan0 точка доступа
      apActive,
      apDevices,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message) }, { status: 500 });
  }
}

// ── POST — действия ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const { action } = body ?? {};
  const linux = await isLinux();

  try {
    // ── Scan ──────────────────────────────────────────────────────────────────
    if (action === "scan") {
      if (!linux) {
        await new Promise((r) => setTimeout(r, 800));
        const s = globalThis._wifiMockState!;
        return NextResponse.json({
          ok: true,
          _mock: true,
          networks: MOCK_NETWORKS.map((n) => ({ ...n, inUse: n.ssid === s.ssid })),
        });
      }
      const networks = await scanWlan1();
      return NextResponse.json({ ok: true, networks });
    }

    // ── Connect ───────────────────────────────────────────────────────────────
    if (action === "connect") {
      const { ssid, password } = body;
      if (!ssid) {
        return NextResponse.json({ ok: false, error: "ssid required" }, { status: 400 });
      }

      if (!linux) {
        await new Promise((r) => setTimeout(r, 600));
        globalThis._wifiMockState = {
          ssid,
          ip: "192.168.1." + Math.floor(Math.random() * 200 + 10),
          connected: true,
          apDevices: globalThis._wifiMockState?.apDevices ?? 0,
          apActive: true,
        };
        return NextResponse.json({ ok: true, _mock: true, ...globalThis._wifiMockState });
      }

      const result = await connectWlan1(ssid, password);
      if (!result.ok) return NextResponse.json(result);

      const wlan1 = await getWlan1Status();
      return NextResponse.json({ ok: true, ...wlan1 });
    }

    // ── Mode (не используется — wlan0 всегда AP, wlan1 всегда клиент) ─────────
    if (action === "mode") {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message) }, { status: 500 });
  }
}
