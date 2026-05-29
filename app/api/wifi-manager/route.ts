import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ── Platform detection ─────────────────────────────────────────────────────────

async function isLinux(): Promise<boolean> {
  try {
    await execAsync("which iwgetid", { timeout: 2_000 });
    return true;
  } catch { return false; }
}

// ── Mock ───────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var _wifiMockState: {
    ssid: string; ip: string; connected: boolean;
    apDevices: number; apActive: boolean;
  } | undefined;
}
if (!globalThis._wifiMockState) {
  globalThis._wifiMockState = {
    ssid: "HomeNetwork", ip: "192.168.1.42",
    connected: true, apDevices: 3, apActive: true,
  };
}

const MOCK_SAVED = [
  { id: "0", ssid: "HomeNetwork" },
  { id: "1", ssid: "OfficeWiFi" },
];
const MOCK_NETWORKS = [
  { ssid: "HomeNetwork",   signal: 90, security: "WPA2", inUse: true  },
  { ssid: "OfficeWiFi",   signal: 72, security: "WPA2", inUse: false },
  { ssid: "CafeGuest",    signal: 55, security: "—",    inUse: false },
  { ssid: "Neighbor_5G",  signal: 38, security: "WPA3", inUse: false },
  { ssid: "IoT_Hub",      signal: 21, security: "WPA2", inUse: false },
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

async function getApDevices(): Promise<number> {
  const out = await run("iw dev wlan0 station dump 2>/dev/null | grep -c '^Station'");
  const n = parseInt(out);
  return isNaN(n) ? 0 : n;
}

async function getApActive(): Promise<boolean> {
  const out = await run("nmcli -t -f GENERAL.STATE con show pi-hotspot 2>/dev/null");
  return out.includes("activated");
}

async function getWlan1Status(): Promise<{ ssid: string; ip: string; connected: boolean }> {
  const ip = await run(
    "ip -4 addr show wlan1 scope global | grep -oP '(?<=inet )\\d+\\.\\d+\\.\\d+\\.\\d+' | head -1"
  );
  const ssid = await run("iwgetid wlan1 -r 2>/dev/null");
  return { ip: ip || "—", ssid: ssid || "—", connected: !!ip && !!ssid };
}

/** Сохранённые сети из wpa_cli */
async function getSavedNetworks(): Promise<{ id: string; ssid: string }[]> {
  const out = await run("sudo wpa_cli -i wlan1 list_networks 2>/dev/null");
  const lines = out.split("\n").slice(1);
  const nets: { id: string; ssid: string }[] = [];
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length >= 2 && parts[1]?.trim()) {
      nets.push({ id: parts[0].trim(), ssid: parts[1].trim() });
    }
  }
  return nets;
}

/** Проверить интернет через wlan1 */
async function checkInternet(): Promise<boolean> {
  const out = await run("ping -c 1 -W 3 -I wlan1 8.8.8.8 2>/dev/null", 6_000);
  return out.includes("bytes from") || out.includes("1 received");
}

async function scanWlan1(): Promise<{ ssid: string; signal: number; security: string; inUse: boolean }[]> {
  const currentSsid = await run("iwgetid wlan1 -r 2>/dev/null");
  await run("sudo wpa_cli -i wlan1 scan");
  await new Promise((r) => setTimeout(r, 2500));
  const out = await run("sudo wpa_cli -i wlan1 scan_results");
  const networks: { ssid: string; signal: number; security: string; inUse: boolean }[] = [];
  const seen = new Set<string>();
  for (const line of out.split("\n").slice(1)) {
    const parts = line.split("\t");
    if (parts.length < 5) continue;
    const [, , signalStr, flags, ssid] = parts;
    if (!ssid || ssid.includes("\\x00") || seen.has(ssid)) continue;
    seen.add(ssid);
    const dBm = parseInt(signalStr) || -100;
    const signal = Math.max(0, Math.min(100, Math.round((dBm + 100) * 2)));
    const security = flags.includes("WPA2") ? "WPA2"
      : flags.includes("WPA") ? "WPA"
      : flags.includes("WEP") ? "WEP" : "—";
    networks.push({ ssid, signal, security, inUse: ssid === currentSsid });
  }
  return networks.sort((a, b) => b.signal - a.signal);
}

/** Подключение к сохранённой сети по id */
async function connectSaved(networkId: string): Promise<{ ok: boolean; noInternet?: boolean; error?: string }> {
  await run(`sudo wpa_cli -i wlan1 select_network ${networkId}`);
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const state = await run("sudo wpa_cli -i wlan1 status | grep wpa_state | cut -d= -f2");
    if (state === "COMPLETED") {
      const internet = await checkInternet();
      return { ok: true, noInternet: !internet };
    }
    if (state === "DISCONNECTED" || state === "INACTIVE") {
      return { ok: false, error: "Не удалось подключиться" };
    }
  }
  return { ok: false, error: "Превышено время ожидания" };
}

/** Подключение к новой сети через wpa_supplicant */
async function connectNew(ssid: string, password?: string): Promise<{ ok: boolean; noInternet?: boolean; error?: string }> {
  const configPath = "/etc/wpa_supplicant/wpa_supplicant-wlan1.conf";
  const current = await run(`cat ${configPath} 2>/dev/null`);
  const escapedSsid = ssid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/"/g, '\\"');
  const cleaned = current
    .replace(new RegExp(`network=\\{[^}]*ssid="${escapedSsid}"[^}]*\\}`, "gs"), "")
    .trim();

  const safeSsid = ssid.replace(/"/g, '\\"');
  let newBlock: string;
  if (password) {
    const raw = await run(`wpa_passphrase "${safeSsid}" "${password.replace(/"/g, '\\"')}"`);
    newBlock = raw.replace(/^\s*#psk=.*$/m, "").trim();
  } else {
    newBlock = `network={\n\tssid="${safeSsid}"\n\tkey_mgmt=NONE\n}`;
  }

  const b64 = Buffer.from(`${cleaned}\n\n${newBlock}\n`).toString("base64");
  await run(`echo "${b64}" | base64 -d | sudo tee ${configPath} > /dev/null`);
  await run("sudo wpa_cli -i wlan1 reconfigure");

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const state = await run("sudo wpa_cli -i wlan1 status | grep wpa_state | cut -d= -f2");
    if (state === "COMPLETED") {
      const internet = await checkInternet();
      return { ok: true, noInternet: !internet };
    }
    if (state === "DISCONNECTED" || state === "INACTIVE") {
      return { ok: false, error: "Неверный пароль или сеть недоступна" };
    }
  }
  return { ok: false, error: "Не удалось подключиться. Проверьте пароль." };
}

/** Удалить сохранённую сеть */
async function forgetNetwork(networkId: string): Promise<{ ok: boolean }> {
  await run(`sudo wpa_cli -i wlan1 remove_network ${networkId}`);
  await run("sudo wpa_cli -i wlan1 save_config");
  return { ok: true };
}

// ── GET — статус + сохранённые сети ───────────────────────────────────────────

export async function GET() {
  try {
    const linux = await isLinux();
    if (!linux) {
      const s = globalThis._wifiMockState!;
      return NextResponse.json({
        ok: true, mode: "client" as const, ...s,
        savedNetworks: MOCK_SAVED, _mock: true,
      });
    }
    const [wlan1, apActive, apDevices, savedNetworks] = await Promise.all([
      getWlan1Status(), getApActive(), getApDevices(), getSavedNetworks(),
    ]);
    return NextResponse.json({
      ok: true, mode: "client" as const,
      ssid: wlan1.ssid, ip: wlan1.ip, connected: wlan1.connected,
      apActive, apDevices, savedNetworks,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message) }, { status: 500 });
  }
}

// ── POST — действия ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }); }

  const { action } = body ?? {};
  const linux = await isLinux();

  try {
    // ── Scan ──────────────────────────────────────────────────────────────────
    if (action === "scan") {
      if (!linux) {
        await new Promise((r) => setTimeout(r, 1000));
        const s = globalThis._wifiMockState!;
        return NextResponse.json({
          ok: true, _mock: true,
          networks: MOCK_NETWORKS.map((n) => ({ ...n, inUse: n.ssid === s.ssid })),
        });
      }
      return NextResponse.json({ ok: true, networks: await scanWlan1() });
    }

    // ── Connect saved ─────────────────────────────────────────────────────────
    if (action === "connectSaved") {
      const { networkId } = body;
      if (!networkId) return NextResponse.json({ ok: false, error: "networkId required" }, { status: 400 });
      if (!linux) {
        await new Promise((r) => setTimeout(r, 700));
        const found = MOCK_SAVED.find((n) => n.id === networkId);
        if (found) {
          globalThis._wifiMockState = { ...globalThis._wifiMockState!, ssid: found.ssid, connected: true };
        }
        return NextResponse.json({ ok: true, _mock: true, noInternet: false, ...globalThis._wifiMockState });
      }
      const result = await connectSaved(networkId);
      if (!result.ok) return NextResponse.json(result);
      const wlan1 = await getWlan1Status();
      return NextResponse.json({ ok: true, ...wlan1, noInternet: result.noInternet });
    }

    // ── Connect new ───────────────────────────────────────────────────────────
    if (action === "connect") {
      const { ssid, password } = body;
      if (!ssid) return NextResponse.json({ ok: false, error: "ssid required" }, { status: 400 });
      if (!linux) {
        await new Promise((r) => setTimeout(r, 1500));
        globalThis._wifiMockState = {
          ssid, ip: "192.168.1." + Math.floor(Math.random() * 200 + 10),
          connected: true, apDevices: globalThis._wifiMockState?.apDevices ?? 0, apActive: true,
        };
        return NextResponse.json({ ok: true, _mock: true, noInternet: false, ...globalThis._wifiMockState });
      }
      const result = await connectNew(ssid, password);
      if (!result.ok) return NextResponse.json(result);
      const wlan1 = await getWlan1Status();
      return NextResponse.json({ ok: true, ...wlan1, noInternet: result.noInternet });
    }

    // ── Forget ────────────────────────────────────────────────────────────────
    if (action === "forget") {
      const { networkId } = body;
      if (!networkId) return NextResponse.json({ ok: false, error: "networkId required" }, { status: 400 });
      if (!linux) return NextResponse.json({ ok: true, _mock: true });
      return NextResponse.json(await forgetNetwork(networkId));
    }

    // ── Mode (legacy) ─────────────────────────────────────────────────────────
    if (action === "mode") return NextResponse.json({ ok: true });

    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message) }, { status: 500 });
  }
}
