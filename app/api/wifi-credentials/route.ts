import { NextRequest, NextResponse } from "next/server";
import { EventEmitter } from "events";

export interface WifiCredentials {
  ssid: string;
  password: string;
  updatedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var wifiCredentials: WifiCredentials | null | undefined;
  // eslint-disable-next-line no-var
  var wifiEmitter: EventEmitter | undefined;
}

if (!globalThis.wifiEmitter) {
  globalThis.wifiEmitter = new EventEmitter();
  globalThis.wifiEmitter.setMaxListeners(200);
}

function broadcast() {
  globalThis.wifiEmitter!.emit("update", globalThis.wifiCredentials ?? null);
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(req: NextRequest) {
  try {
    const { ssid, password } = JSON.parse(await req.text());
    if (!ssid) {
      return NextResponse.json({ ok: false, error: "ssid required" }, { status: 400, headers: cors });
    }
    globalThis.wifiCredentials = { ssid: String(ssid), password: String(password ?? ""), updatedAt: new Date().toISOString() };
    broadcast();
    return NextResponse.json({ ok: true }, { headers: cors });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400, headers: cors });
  }
}

export async function GET() {
  return NextResponse.json(globalThis.wifiCredentials ?? null);
}
