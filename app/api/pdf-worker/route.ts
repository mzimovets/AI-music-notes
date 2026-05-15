import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  const workerPath = path.resolve(
    "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
  );
  const content = await readFile(workerPath);
  return new Response(content, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
