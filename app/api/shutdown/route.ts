// Выключение платы. Только на IS_LOCAL_SERVER=true.
import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST() {
  if (process.env.IS_LOCAL_SERVER !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    // Отвечаем клиенту до выключения, потом через 2 сек выключаем
    setTimeout(() => {
      try { execSync("sudo shutdown -h now"); } catch {}
    }, 2000);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
