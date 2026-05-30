import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const BACKEND = process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";
const SYNC_STATE_PATH = join(process.cwd(), "server", "sync-state.json");
const SYNC_HISTORY_PATH = join(process.cwd(), "server", "sync-history.json");

export async function GET() {
  let lastSyncedAt = 0;
  let history: any[] = [];
  try {
    if (existsSync(SYNC_STATE_PATH)) {
      const parsed = JSON.parse(readFileSync(SYNC_STATE_PATH, "utf8"));
      lastSyncedAt = parsed.timestamp || parsed.lastSyncedAt || 0;
    }
  } catch {}
  try {
    if (existsSync(SYNC_HISTORY_PATH)) {
      history = JSON.parse(readFileSync(SYNC_HISTORY_PATH, "utf8")).slice(0, 10);
    }
  } catch {}
  return NextResponse.json({ lastSyncedAt, history });
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
