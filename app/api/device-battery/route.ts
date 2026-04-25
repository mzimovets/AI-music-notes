import { NextRequest, NextResponse } from "next/server";
import { EventEmitter } from "events";

export interface DeviceEntry {
  battery: number;
  updatedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var deviceBattery: Map<string, DeviceEntry> | undefined;
  // eslint-disable-next-line no-var
  var batteryEmitter: EventEmitter | undefined;
}

if (!globalThis.deviceBattery) {
  globalThis.deviceBattery = new Map();
}
if (!globalThis.batteryEmitter) {
  globalThis.batteryEmitter = new EventEmitter();
  globalThis.batteryEmitter.setMaxListeners(200);
}

export function getAll(): Record<string, DeviceEntry> {
  return Object.fromEntries(globalThis.deviceBattery!.entries());
}

function broadcast() {
  globalThis.batteryEmitter!.emit("update", getAll());
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { deviceName, battery } = JSON.parse(await req.text());
    if (!deviceName) {
      return NextResponse.json({ ok: false, error: "deviceName required" }, { status: 400, headers: corsHeaders });
    }
    const level = Math.round(Number(battery));
    globalThis.deviceBattery!.set(String(deviceName), {
      battery: isNaN(level) ? 0 : Math.max(0, Math.min(100, level)),
      updatedAt: new Date().toISOString(),
    });
    broadcast();
    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400, headers: corsHeaders });
  }
}

export async function GET() {
  return NextResponse.json(getAll());
}

export async function DELETE(req: NextRequest) {
  try {
    const { deviceName } = await req.json();
    if (!deviceName) {
      return NextResponse.json({ ok: false, error: "deviceName required" }, { status: 400 });
    }
    globalThis.deviceBattery!.delete(String(deviceName));
    broadcast();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
}
