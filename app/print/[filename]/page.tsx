"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function PrintPage({
  params,
}: {
  params: {
    filename: string;
  };
}) {
  const filename = params.filename;
  const uploadsSrc = useMemo(
    () => `/uploads/${encodeURIComponent(filename)}`,
    [filename],
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const pdfIframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    // Пытаемся запустить печать через вложенный iframe.
    // Если браузер по какой-то причине запретит доступ, используем `window.print()` как fallback.
    const t = window.setTimeout(() => {
      try {
        const pdfWindow = pdfIframeRef.current?.contentWindow;
        pdfWindow?.focus?.();
        pdfWindow?.print?.();
      } catch {
        window.print();
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [isLoaded]);

  useEffect(() => {
    // Сообщаем родителю, что печать завершена, чтобы снять spinner.
    const handler = () => {
      try {
        window.parent?.postMessage(
          { type: "print:after", filename },
          "*",
        );
      } catch {
        // best-effort
      }
    };

    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, [filename]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
      }}
    >
      <iframe
        ref={pdfIframeRef}
        src={uploadsSrc}
        onLoad={() => setIsLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          border: 0,
        }}
        title="PDF for print"
      />
    </div>
  );
}

