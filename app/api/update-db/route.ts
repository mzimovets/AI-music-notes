import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const BACKEND = process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";
const SYNC_STATE_PATH = join(process.cwd(), "server", "sync-state.json");

export async function GET() {
  let lastSyncedAt = 0;
  try {
    if (existsSync(SYNC_STATE_PATH)) {
      const raw = readFileSync(SYNC_STATE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      lastSyncedAt = parsed.timestamp || parsed.lastSyncedAt || 0;
    }
  } catch {}
  return NextResponse.json({ lastSyncedAt });
}

export async function POST() {
  try {
    const res = await fetch(`${BACKEND}/api/sync/manual`, {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message), logs: [] },
      { status: 500 }
    );
  }
}
