import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function run(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 3_000 });
    return stdout.trim();
  } catch { return ""; }
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function parseNetIface(out: string, iface: string) {
  for (const line of out.split("\n")) {
    const t = line.trim();
    if (!t.startsWith(iface + ":")) continue;
    const parts = t.split(/\s+/);
    return { rx: parseInt(parts[1]) || 0, tx: parseInt(parts[9]) || 0 };
  }
  return { rx: 0, tx: 0 };
}

declare global {
  var _mockSys: { fan: number; cpu: number } | undefined;
  var _netPrev: { ts: number; w0rx: number; w0tx: number; w1rx: number; w1tx: number } | undefined;
}

export async function GET() {
  if (process.platform !== "linux") {
    if (!globalThis._mockSys) globalThis._mockSys = { fan: 2400, cpu: 22 };
    const s = globalThis._mockSys;
    s.fan = Math.max(0, Math.min(5000, s.fan + (Math.random() - 0.5) * 300));
    s.cpu = Math.max(0, Math.min(100, s.cpu + (Math.random() - 0.5) * 12));
    return NextResponse.json({
      temp: +(52 + Math.sin(Date.now() / 30_000) * 9).toFixed(1),
      fanRpm: Math.round(s.fan),
      cpuPercent: Math.round(s.cpu),
      ramUsed: Math.round(1100 + Math.random() * 300),
      ramTotal: 4096,
      uptime: "1д 6ч",
      wlan1Signal: -52,
      throttled: false,
      wlan1LinkMbps: 144,
      wlan0RxBps: Math.round(Math.random() * 20_000),
      wlan0TxBps: Math.round(60_000 + Math.random() * 180_000),
      wlan1RxBps: Math.round(100_000 + Math.random() * 400_000),
      wlan1TxBps: Math.round(5_000 + Math.random() * 40_000),
      voltageCore: +(1.08 + Math.sin(Date.now() / 20_000) * 0.05).toFixed(3),
      clockArmMhz: Math.round(1800 + Math.random() * 600),
    });
  }

  const [tempStr, fanStr, loadStr, memStr, uptimeStr, signalStr, throttledStr, ncpuStr, netStr, linkStr, voltStr, clockStr] = await Promise.all([
    run("cat /sys/class/thermal/thermal_zone0/temp"),
    run("cat /sys/class/hwmon/hwmon*/fan1_input 2>/dev/null | head -1"),
    run("cat /proc/loadavg"),
    run("cat /proc/meminfo"),
    run("cat /proc/uptime"),
    run("iw dev wlan1 link 2>/dev/null | awk '/signal/{print $2}'"),
    run("vcgencmd get_throttled 2>/dev/null || echo throttled=0x0"),
    run("nproc"),
    run("cat /proc/net/dev"),
    run("iw dev wlan1 link 2>/dev/null | grep 'tx bitrate'"),
    run("vcgencmd measure_volts core 2>/dev/null || echo volt=0V"),
    run("vcgencmd measure_clock arm 2>/dev/null || echo frequency(48)=0"),
  ]);

  const temp = +((parseInt(tempStr) / 1000) || 0).toFixed(1);
  const fanRpm = parseInt(fanStr) || 0;
  const load1 = parseFloat(loadStr.split(" ")[0]) || 0;
  const ncpu = parseInt(ncpuStr) || 4;
  const cpuPercent = Math.min(100, Math.round((load1 / ncpu) * 100));
  const memTotal = Math.round(parseInt(memStr.match(/MemTotal:\s+(\d+)/)?.[1] ?? "0") / 1024);
  const memAvail = Math.round(parseInt(memStr.match(/MemAvailable:\s+(\d+)/)?.[1] ?? "0") / 1024);
  const ramUsed = memTotal - memAvail;
  const uptimeSec = parseFloat(uptimeStr.split(" ")[0]) || 0;
  const uptime = fmtUptime(uptimeSec);
  const wlan1Signal = parseInt(signalStr) || -100;
  const throttled = throttledStr.includes("throttled=") && !throttledStr.includes("throttled=0x0");
  const linkMatch = linkStr.match(/([\d.]+)\s*MBit/);
  const wlan1LinkMbps = linkMatch ? parseFloat(linkMatch[1]) : 0;

  const w0 = parseNetIface(netStr, "wlan0");
  const w1 = parseNetIface(netStr, "wlan1");
  const now = Date.now();
  let wlan0RxBps = 0, wlan0TxBps = 0, wlan1RxBps = 0, wlan1TxBps = 0;

  if (globalThis._netPrev) {
    const dt = (now - globalThis._netPrev.ts) / 1000;
    if (dt > 0.1) {
      wlan0RxBps = Math.max(0, Math.round((w0.rx - globalThis._netPrev.w0rx) / dt));
      wlan0TxBps = Math.max(0, Math.round((w0.tx - globalThis._netPrev.w0tx) / dt));
      wlan1RxBps = Math.max(0, Math.round((w1.rx - globalThis._netPrev.w1rx) / dt));
      wlan1TxBps = Math.max(0, Math.round((w1.tx - globalThis._netPrev.w1tx) / dt));
    }
  }
  globalThis._netPrev = { ts: now, w0rx: w0.rx, w0tx: w0.tx, w1rx: w1.rx, w1tx: w1.tx };

  const voltMatch = voltStr.match(/volt=([\d.]+)V/);
  const voltageCore = voltMatch ? +parseFloat(voltMatch[1]).toFixed(3) : 0;
  const clockMatch = clockStr.match(/frequency\(\d+\)=(\d+)/);
  const clockArmMhz = clockMatch ? Math.round(parseInt(clockMatch[1]) / 1_000_000) : 0;

  return NextResponse.json({
    temp, fanRpm, cpuPercent, ramUsed, ramTotal: memTotal, uptime,
    wlan1Signal, throttled, wlan1LinkMbps,
    wlan0RxBps, wlan0TxBps, wlan1RxBps, wlan1TxBps,
    voltageCore, clockArmMhz,
  });
}
