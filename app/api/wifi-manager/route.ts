import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ── Detect platform ────────────────────────────────────────────────────────────

/** true — работаем на Linux с nmcli; false — мок (macOS / dev) */
async function hasNmcli(): Promise<boolean> {
  try {
    await execAsync("which nmcli", { timeout: 2_000 });
    return true;
  } catch {
    return false;
  }
}

// ── Mock data (macOS / dev) ────────────────────────────────────────────────────

// Сохраняем состояние между запросами в глобальном объекте (Next.js dev server)
declare global {
  // eslint-disable-next-line no-var
  var _wifiMockState:
    | { mode: "client" | "ap"; ssid: string; ip: string; connected: boolean }
    | undefined;
}
if (!globalThis._wifiMockState) {
  globalThis._wifiMockState = {
    mode: "client",
    ssid: "HomeNetwork",
    ip: "192.168.1.42",
    connected: true,
  };
}

const MOCK_NETWORKS = [
  { ssid: "HomeNetwork",   signal: 90, security: "WPA2", inUse: true  },
  { ssid: "OfficeWiFi",    signal: 72, security: "WPA2", inUse: false },
  { ssid: "CafeGuest",     signal: 55, security: "—",    inUse: false },
  { ssid: "Neighbor_5G",   signal: 38, security: "WPA3", inUse: false },
  { ssid: "IoT_Hub",       signal: 21, security: "WPA2", inUse: false },
];

// ── Helpers (real nmcli) ───────────────────────────────────────────────────────

async function run(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 10_000 });
    return stdout.trim();
  } catch (err: any) {
    return err?.stdout?.trim() ?? "";
  }
}

async function getIp(): Promise<string> {
  const out = await run(
    "ip -4 addr show scope global | grep -oP '(?<=inet )\\d+\\.\\d+\\.\\d+\\.\\d+' | head -1"
  );
  return out || "—";
}

async function getWifiStatusReal(): Promise<{
  ssid: string;
  mode: "client" | "ap" | "unknown";
  ip: string;
  connected: boolean;
}> {
  const ip = await getIp();

  const apCheck = await run(
    "nmcli -t -f NAME,TYPE con show --active | grep ':802-11-wireless' | head -1"
  );
  if (apCheck.toLowerCase().includes("hotspot") || apCheck.toLowerCase().includes("ap")) {
    const name = apCheck.split(":")[0] || "Hotspot";
    return { ssid: name, mode: "ap", ip, connected: true };
  }

  const ssidOut = await run(
    "nmcli -t -f active,ssid dev wifi | grep '^yes' | cut -d: -f2 | head -1"
  );
  if (ssidOut) {
    return { ssid: ssidOut, mode: "client", ip, connected: true };
  }

  return { ssid: "—", mode: "unknown", ip, connected: false };
}

async function scanReal(): Promise<
  { ssid: string; signal: number; security: string; inUse: boolean }[]
> {
  await run("nmcli dev wifi rescan").catch(() => {});
  const out = await run("nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list");

  const networks: { ssid: string; signal: number; security: string; inUse: boolean }[] = [];
  const seen = new Set<string>();

  for (const line of out.split("\n")) {
    const parts = line.split(":");
    if (parts.length < 4) continue;
    const inUse = parts[0] === "*";
    const ssid = parts.slice(1, parts.length - 2).join(":").trim();
    const signal = parseInt(parts[parts.length - 2]) || 0;
    const security = parts[parts.length - 1] || "—";
    if (!ssid || seen.has(ssid)) continue;
    seen.add(ssid);
    networks.push({ ssid, signal, security, inUse });
  }

  return networks.sort((a, b) => b.signal - a.signal);
}

// ── Routes ─────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const nmcli = await hasNmcli();

    if (!nmcli) {
      const s = globalThis._wifiMockState!;
      return NextResponse.json({ ok: true, ...s, _mock: true });
    }

    const status = await getWifiStatusReal();
    return NextResponse.json({ ok: true, ...status });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const { action } = body ?? {};
  const nmcli = await hasNmcli();

  try {
    // ── Scan ──────────────────────────────────────────────────────────────────
    if (action === "scan") {
      if (!nmcli) {
        // Небольшая задержка — имитируем реальное сканирование
        await new Promise((r) => setTimeout(r, 800));
        const s = globalThis._wifiMockState!;
        return NextResponse.json({
          ok: true,
          _mock: true,
          networks: MOCK_NETWORKS.map((n) => ({ ...n, inUse: n.ssid === s.ssid })),
        });
      }
      const networks = await scanReal();
      return NextResponse.json({ ok: true, networks });
    }

    // ── Connect ───────────────────────────────────────────────────────────────
    if (action === "connect") {
      const { ssid, password } = body;
      if (!ssid) {
        return NextResponse.json({ ok: false, error: "ssid required" }, { status: 400 });
      }

      if (!nmcli) {
        await new Promise((r) => setTimeout(r, 600));
        globalThis._wifiMockState = {
          mode: "client",
          ssid,
          ip: "192.168.1." + Math.floor(Math.random() * 200 + 10),
          connected: true,
        };
        const s = globalThis._wifiMockState;
        return NextResponse.json({ ok: true, _mock: true, ...s });
      }

      const existingOut = await run(
        `nmcli -t -f NAME,TYPE con show | grep '802-11-wireless' | cut -d: -f1`
      );
      const existing = existingOut.split("\n").find(
        (n) => n.toLowerCase() === ssid.toLowerCase()
      );

      let cmd: string;
      if (existing) {
        cmd = `nmcli con up "${existing.replace(/"/g, '\\"')}"`;
      } else if (password) {
        cmd = `nmcli dev wifi connect "${ssid.replace(/"/g, '\\"')}" password "${password.replace(/"/g, '\\"')}"`;
      } else {
        cmd = `nmcli dev wifi connect "${ssid.replace(/"/g, '\\"')}"`;
      }

      const out = await run(cmd);
      const success = out.includes("successfully") || out.includes("активировано");
      if (success) {
        const status = await getWifiStatusReal();
        return NextResponse.json({ ok: true, ...status });
      } else {
        return NextResponse.json({ ok: false, error: out || "Ошибка подключения" });
      }
    }

    // ── Mode ──────────────────────────────────────────────────────────────────
    if (action === "mode") {
      const { mode } = body as { mode: "ap" | "client" };

      if (!nmcli) {
        await new Promise((r) => setTimeout(r, 400));
        globalThis._wifiMockState = {
          ...globalThis._wifiMockState!,
          mode,
          ssid: mode === "ap" ? "Music-Notes" : globalThis._wifiMockState!.ssid,
        };
        return NextResponse.json({ ok: true, _mock: true });
      }

      if (mode === "ap") {
        const out = await run(
          "nmcli dev wifi hotspot ifname wlan0 ssid 'Music-Notes' password '12345678'"
        );
        const ok = !out.toLowerCase().includes("error");
        return NextResponse.json({ ok });
      }

      if (mode === "client") {
        await run("nmcli con down Hotspot 2>/dev/null || true");
        await run("nmcli radio wifi on");
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: false, error: "unknown mode" }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message) }, { status: 500 });
  }
}
