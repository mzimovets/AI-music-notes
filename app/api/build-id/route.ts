import { NextResponse } from "next/server";

/**
 * Отдаёт идентификатор сборки, которая сейчас работает на сервере.
 * Значение подставляется при сборке, поэтому после выкладки оно меняется, и
 * открытая вкладка по расхождению понимает, что её версия устарела.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? "" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
