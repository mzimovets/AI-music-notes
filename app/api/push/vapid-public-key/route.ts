import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/push/vapid-public-key`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: e.message }, { status: 500 });
  }
}
