import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [songsRes, stacksRes] = await Promise.all([
      fetch("http://localhost:4000/songs", { signal: AbortSignal.timeout(5000) }),
      fetch("http://localhost:4000/stacks", { signal: AbortSignal.timeout(5000) }),
    ]);
    const songs = await songsRes.json();
    const stacks = await stacksRes.json();
    return NextResponse.json({
      songsCount: Array.isArray(songs.docs) ? songs.docs.length : 0,
      stacksCount: Array.isArray(stacks.docs) ? stacks.docs.length : 0,
    });
  } catch {
    return NextResponse.json({ songsCount: 0, stacksCount: 0 });
  }
}
