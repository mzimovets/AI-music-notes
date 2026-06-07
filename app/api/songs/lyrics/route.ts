import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name") || "";
    const res = await fetch(`${BACKEND}/api/songs/lyrics?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: e.message }, { status: 500 });
  }
}
