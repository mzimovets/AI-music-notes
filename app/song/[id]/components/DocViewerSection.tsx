"use client";
import { DocViewer } from "./DocViewer";
import { ReactNode } from "react";

export function DocViewerSection({
  fileUrl,
  songId,
  children,
}: {
  fileUrl: string;
  songId: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative inline-block w-full">
      {children && (
        // Абсолютный блок шириной 100vw, начинается от левого края viewport.
        // left: calc(50% - 50vw) выводит за левую границу контента на край viewport.
        // right: 0 внутри него = правый край viewport.
        // Не создаёт горизонтального overflow (в отличие от negative right).
        <div
          style={{
            position: "absolute",
            left: "calc(50% - 50vw)",
            top: 0,
            bottom: 160,
            width: "100vw",
            overflow: "visible",
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 60,
            }}
          >
            <div
              style={{
                position: "sticky",
                top: "calc(50vh - 110px)",
                pointerEvents: "all",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      )}
      <DocViewer fileUrl={fileUrl} songId={songId} />
    </div>
  );
}
