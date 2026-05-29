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

declare global { var _mockSys: { fan: number; cpu: number } | undefined; }

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
    });
  }

  const [tempStr, fanStr, loadStr, memStr, uptimeStr, signalStr, throttledStr, ncpuStr] = await Promise.all([
    run("cat /sys/class/thermal/thermal_zone0/temp"),
    run("{ cat /sys/class/hwmon/hwmon0/fan1_input 2>/dev/null || cat /sys/class/hwmon/hwmon1/fan1_input 2>/dev/null || cat /sys/class/hwmon/hwmon2/fan1_input 2>/dev/null; } | head -1"),
    run("cat /proc/loadavg"),
    run("cat /proc/meminfo"),
    run("cat /proc/uptime"),
    run("iw dev wlan1 link 2>/dev/null | awk '/signal/{print $2}'"),
    run("vcgencmd get_throttled 2>/dev/null || echo throttled=0x0"),
    run("nproc"),
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

  return NextResponse.json({ temp, fanRpm, cpuPercent, ramUsed, ramTotal: memTotal, uptime, wlan1Signal, throttled });
}
