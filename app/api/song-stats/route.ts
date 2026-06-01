import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [songsRes, stacksRes] = await Promise.all([
      fetch("http://localhost:4000/songs", { cache: "no-store" }),
      fetch("http://localhost:4000/stacks", { cache: "no-store" }),
    ]);
    const songs = await songsRes.json();
    const stacks = await stacksRes.json();
    return NextResponse.json({
      songsCount: Array.isArray(songs.docs) ? songs.docs.length : 0,
      stacksCount: Array.isArray(stacks.docs) ? stacks.docs.length : 0,
    });
  } catch (e) {
    console.error("[song-stats]", e);
    return NextResponse.json({ songsCount: 0, stacksCount: 0 });
  }
}
