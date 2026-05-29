import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";

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
