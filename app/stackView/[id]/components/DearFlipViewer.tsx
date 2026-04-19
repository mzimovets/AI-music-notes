"use client";
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

const BASE_CDN =
  "https://cdn.jsdelivr.net/gh/dearhive/dearflip-js-flipbook@master/dflip";

// ─── Cover colours — matched to /public/stacks/cover/*.png names ────────────
export const COVER_COLORS: Record<string, string> = {
  blue:          "#4A90D9",
  brown:         "#8B5E3C",
  "dark-purple": "#5B2B8C",
  green:         "#3A8C5C",
  grey:          "#7A8A99",
  ocean:         "#1A7A9A",
  orange:        "#D9823A",
  purple:        "#7A4AB0",
  red:           "#C0392B",
  salat:         "#7AB040",
  white:         "#C8BEB5",
  yellow:        "#D4A843",
};

// ─── Global script-load state ────────────────────────────────────────────────
let loadState: "idle" | "loading" | "loaded" = "idle";
const loadCallbacks: Array<() => void> = [];

function ensureDearFlipLoaded(onReady: () => void) {
  if (loadState === "loaded") { onReady(); return; }
  loadCallbacks.push(onReady);
  if (loadState === "loading") return;
  loadState = "loading";

  // CSS
  for (const href of [
    `${BASE_CDN}/css/dflip.min.css`,
    `${BASE_CDN}/css/themify-icons.min.css`,
  ]) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  // jQuery → dflip
  const jq = Object.assign(document.createElement("script"), {
    src: `${BASE_CDN}/js/libs/jquery.min.js`,
  });
  jq.onload = () => {
    const df = Object.assign(document.createElement("script"), {
      src: `${BASE_CDN}/js/dflip.min.js`,
    });
    df.onload = () => {
      const DFLIP = (window as any).DFLIP;
      if (DFLIP?.defaults) {
        DFLIP.defaults.pdfjsWorkerSrc = `${BASE_CDN}/js/libs/pdf.worker.min.js`;
        DFLIP.defaults.pdfjsCMapUrl   = `${BASE_CDN}/js/libs/cmaps/`;
        DFLIP.defaults.pdfjsCMapPacked = true;
      }
      loadState = "loaded";
      loadCallbacks.splice(0).forEach((cb) => cb());
    };
    df.onerror = () => { loadState = "idle"; };
    document.head.appendChild(df);
  };
  jq.onerror = () => { loadState = "idle"; };
  document.head.appendChild(jq);
}

// ─── Public handle exposed via ref ───────────────────────────────────────────
export interface DearFlipViewerHandle {
  goToPage: (page: number) => void;
  getActivePage: () => number;
}

// ─── Component ───────────────────────────────────────────────────────────────
export interface DearFlipViewerProps {
  /** Absolute or root-relative URL of the (merged) PDF */
  pdfUrl: string;
  /** Pixel height of the flipbook area */
  height: number;
  /** Hex colour for the 3-D book cover, e.g. "#4A90D9" */
  coverColor?: string;
}

export const DearFlipViewer = forwardRef<DearFlipViewerHandle, DearFlipViewerProps>(
  ({ pdfUrl, height, coverColor }, ref) => {
    const containerRef  = useRef<HTMLDivElement>(null);
    const flipbookRef   = useRef<any>(null);

    const heightRef = useRef(height);
    useEffect(() => { heightRef.current = height; }, [height]);

    const coverColorRef = useRef(coverColor);
    useEffect(() => { coverColorRef.current = coverColor; }, [coverColor]);

    // Expose goToPage / getActivePage to parent
    useImperativeHandle(ref, () => ({
      goToPage: (page: number) => {
        const fb = flipbookRef.current;
        if (!fb) return;
        try { fb.gotoPage?.(page); } catch (_) {}
      },
      getActivePage: () => {
        const fb = flipbookRef.current;
        if (!fb) return 1;
        try { return fb._activePage ?? fb.currentPage ?? 1; } catch (_) { return 1; }
      },
    }));

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      let unmounted = false;

      const init = () => {
        if (unmounted || !el) return;
        const $ = (window as any).$;
        if (!$) return;

        const isMobile = window.innerWidth < 768;

        // DearFlip needs an absolute URL
        const abs = pdfUrl.startsWith("http")
          ? pdfUrl
          : `${window.location.origin}${pdfUrl}`;

        $(el).empty();

        // Inject CSS once: hide nav arrows
        if (!document.getElementById("df-custom-style")) {
          const style = document.createElement("style");
          style.id = "df-custom-style";
          style.textContent = `
            .df-ui-prev, .df-ui-next { display: none !important; }
          `;
          document.head.appendChild(style);
        }

        flipbookRef.current = $(el).flipBook(abs, {
          height: heightRef.current,
          webgl:  true,
          soundEnable: false,

          transparent:     false,
          backgroundColor: "#F7F4F1",

          // Первая и последняя страницы — твёрдые обложки
          hard: "cover",

          // Мобильный: одна страница + зум; Десктоп: разворот
          pageMode:       isMobile ? 1 : 2,
          singlePageMode: isMobile ? 1 : 0,

          paddingTop:    5,
          paddingLeft:   5,
          paddingRight:  5,
          paddingBottom: 5,
          zoomRatio:     1.5,

          controlsPosition: "hide",

          // Открываем со второй страницы (первая — твёрдая обложка)
          startPage: 2,

          // Длительность анимации перелистывания
          duration: 600,

          onReady: () => {},
        });
      };

      ensureDearFlipLoaded(init);

      return () => {
        unmounted = true;
        try { flipbookRef.current?.dispose?.(); } catch (_) {}
        flipbookRef.current = null;
        const $ = (window as any).$;
        if ($ && el) {
          try { $(el).empty(); } catch (_) {}
        }
      };
    }, [pdfUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    return <div ref={containerRef} className="w-full" style={{ height }} />;
  }
);

DearFlipViewer.displayName = "DearFlipViewer";
