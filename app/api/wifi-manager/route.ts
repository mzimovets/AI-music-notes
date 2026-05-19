import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ── Helpers ────────────────────────────────────────────────────────────────────

async function run(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 10_000 });
    return stdout.trim();
  } catch (err: any) {
    return err?.stdout?.trim() ?? "";
  }
}

/** Текущий IP (берём первый не-loopback IPv4) */
async function getIp(): Promise<string> {
  const out = await run(
    "ip -4 addr show scope global | grep -oP '(?<=inet )\\d+\\.\\d+\\.\\d+\\.\\d+' | head -1"
  );
  return out || "—";
}

/** Имя подключённой сети и режим */
async function getWifiStatus(): Promise<{
  ssid: string;
  mode: "client" | "ap" | "unknown";
  ip: string;
  connected: boolean;
}> {
  const ip = await getIp();

  // Проверяем точку доступа
  const apCheck = await run(
    "nmcli -t -f NAME,TYPE con show --active | grep ':802-11-wireless' | head -1"
  );
  if (apCheck.toLowerCase().includes("hotspot") || apCheck.toLowerCase().includes("ap")) {
    const name = apCheck.split(":")[0] || "Hotspot";
    return { ssid: name, mode: "ap", ip, connected: true };
  }

  // Клиентский режим
  const ssidOut = await run("nmcli -t -f active,ssid dev wifi | grep '^yes' | cut -d: -f2 | head -1");
  if (ssidOut) {
    return { ssid: ssidOut, mode: "client", ip, connected: true };
  }

  return { ssid: "—", mode: "unknown", ip, connected: false };
}

/** Сканирование сетей */
async function scanNetworks(): Promise<
  { ssid: string; signal: number; security: string; inUse: boolean }[]
> {
  // Принудительное сканирование
  await run("nmcli dev wifi rescan").catch(() => {});

  const out = await run(
    "nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list"
  );

  const networks: { ssid: string; signal: number; security: string; inUse: boolean }[] = [];
  const seen = new Set<string>();

  for (const line of out.split("\n")) {
    // формат: *:SSID:SIGNAL:SECURITY или :SSID:SIGNAL:SECURITY
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
    const status = await getWifiStatus();
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

  try {
    // ── Сканирование ────────────────────────────────────────────────────────────
    if (action === "scan") {
      const networks = await scanNetworks();
      return NextResponse.json({ ok: true, networks });
    }

    // ── Подключение ─────────────────────────────────────────────────────────────
    if (action === "connect") {
      const { ssid, password } = body;
      if (!ssid) {
        return NextResponse.json({ ok: false, error: "ssid required" }, { status: 400 });
      }

      // Если уже есть сохранённое соединение — используем его
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
        const status = await getWifiStatus();
        return NextResponse.json({ ok: true, message: `Подключено к ${ssid}`, ...status });
      } else {
        return NextResponse.json({ ok: false, error: out || "Ошибка подключения" });
      }
    }

    // ── Переключение режима ──────────────────────────────────────────────────────
    if (action === "mode") {
      const { mode } = body; // "ap" | "client"

      if (mode === "ap") {
        // Создаём/включаем точку доступа
        const out = await run(
          "nmcli dev wifi hotspot ifname wlan0 ssid 'Music-Notes' password '12345678'"
        );
        const ok = !out.toLowerCase().includes("error");
        return NextResponse.json({ ok, message: ok ? "Точка доступа включена" : out });
      }

      if (mode === "client") {
        // Выключаем hotspot, переключаемся в клиентский режим
        await run("nmcli con down Hotspot 2>/dev/null || true");
        const out = await run("nmcli radio wifi on");
        return NextResponse.json({ ok: true, message: "Режим клиента включён" });
      }

      return NextResponse.json({ ok: false, error: "unknown mode" }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message) }, { status: 500 });
  }
}
