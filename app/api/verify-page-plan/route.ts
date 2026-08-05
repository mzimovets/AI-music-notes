import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import path from "path";
import fs from "fs/promises";
import {
  buildStackPagePlan,
  collectPlanUrls,
  type PlanEntry,
} from "@/lib/stack-page-plan";

export const runtime = "nodejs";

/**
 * Служебная сверка: план страниц должен совпадать со склейкой страница в
 * страницу, иначе поедут репризы и переходы из боковой панели. Маршрут
 * временный — нужен на время перевода просмотра на план.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";

async function pageCountOfUrl(url: string): Promise<number> {
  try {
    const bytes = url.startsWith("/meals-pdf/")
      ? await fs.readFile(path.join(process.cwd(), "public", url.slice(1)))
      : await (await fetch(`${BACKEND_URL}${url}`)).arrayBuffer();

    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 0;
  }
}

const sameEntries = (plan: PlanEntry[], merged: any[]) => {
  if (plan.length !== merged.length) return false;
  return plan.every((entry, i) => {
    const other = merged[i];
    return (
      entry.pageOffset === other.pageOffset &&
      entry.pageCount === other.pageCount &&
      entry.kind === other.kind &&
      entry.isReserve === other.isReserve
    );
  });
};

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;

  const stacksRes = await fetch(`${BACKEND_URL}/stacks`, { cache: "no-store" });
  const { docs = [] } = await stacksRes.json();

  const report: any[] = [];

  for (const stack of docs) {
    try {
      const urls = collectPlanUrls(stack);
      const counts = new Map<string, number>();
      await Promise.all(
        urls.map(async (url) => counts.set(url, await pageCountOfUrl(url))),
      );

      const plan = buildStackPagePlan(stack, (url) => counts.get(url) ?? 0);

      const mergedRes = await fetch(
        `${origin}/api/merge-stack/${stack._id}?v=verify-${Date.now()}`,
        { cache: "no-store" },
      );
      const header = mergedRes.headers.get("X-Song-Pages");
      const mergedEntries = header ? JSON.parse(header) : [];

      report.push({
        stackId: stack._id,
        name: stack.name,
        match: sameEntries(plan.entries, mergedEntries),
        planPages: plan.pages.length,
        planEntries: plan.entries.map(
          ({ pageOffset, pageCount, kind, isReserve }) => ({
            pageOffset,
            pageCount,
            kind,
            isReserve,
          }),
        ),
        mergedEntries: mergedEntries.map((e: any) => ({
          pageOffset: e.pageOffset,
          pageCount: e.pageCount,
          kind: e.kind,
          isReserve: e.isReserve,
        })),
      });
    } catch (err: any) {
      report.push({ stackId: stack._id, error: err?.message ?? String(err) });
    }
  }

  return NextResponse.json({
    allMatch: report.every((r) => r.match),
    checked: report.length,
    report,
  });
}
