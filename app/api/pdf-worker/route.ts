import { readFile } from "fs/promises";
import path from "path";

const POLYFILL = `if (!Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function(key, fn) {
    if (!this.has(key)) this.set(key, fn(key));
    return this.get(key);
  };
}
`;

let workerCache: string | null = null;

export async function GET() {
  if (!workerCache) {
    const workerPath = path.resolve(
      "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
    );
    workerCache = POLYFILL + (await readFile(workerPath, "utf8"));
  }
  return new Response(workerCache, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
