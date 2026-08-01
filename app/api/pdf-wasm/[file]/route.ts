import { readFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";

// Без этого pdf.js не может декодировать JPEG2000-страницы (JpxError:
// OpenJPEG failed to initialize) — такие встречаются в сканах старых нот.
const ALLOWED_FILES: Record<string, string> = {
  "openjpeg.wasm": "application/wasm",
  "jbig2.wasm": "application/wasm",
  "qcms_bg.wasm": "application/wasm",
  "openjpeg_nowasm_fallback.js": "application/javascript",
};

const cache = new Map<string, Buffer>();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const contentType = ALLOWED_FILES[file];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  let data = cache.get(file);
  if (!data) {
    const filePath = path.resolve("node_modules/pdfjs-dist/wasm", file);
    data = await readFile(filePath);
    cache.set(file, data);
  }

  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
