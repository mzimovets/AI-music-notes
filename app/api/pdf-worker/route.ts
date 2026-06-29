import { readFile } from "fs/promises";
import path from "path";

const POLYFILL = `if (!Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function(key, fn) {
    if (!this.has(key)) this.set(key, fn(key));
    return this.get(key);
  };
}
`;

export async function GET() {
  const workerPath = path.resolve(
    "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
  );
  const content = await readFile(workerPath, "utf8");
  return new Response(POLYFILL + content, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
