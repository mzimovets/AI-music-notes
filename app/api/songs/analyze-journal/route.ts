import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";

export async function GET(req: NextRequest) {
  try {
    const since = req.nextUrl.searchParams.get("since") || "0";
    const res = await fetch(`${BACKEND}/api/songs/analyze-journal?since=${since}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: e.message }, { status: 500 });
  }
}
