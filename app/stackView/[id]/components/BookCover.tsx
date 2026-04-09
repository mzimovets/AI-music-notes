"use client";

/**
 * BookShell — the physical hardcover book rendered behind DearFlip.
 * DearFlip must be initialized with transparent:true so the shell shows through.
 */

interface BookShellProps {
  coverName: string;   // "blue" | "brown" | … — filename in /public/stacks/cover/
  coverColor: string;  // hex, e.g. "#8B5E3C"
  height: number;      // matches DearFlip container height in px
}

function darken(hex: string, amt = 40): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `rgb(${r},${g},${b})`;
}
function lighten(hex: string, amt = 30): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

export function BookShell({ coverName, coverColor, height }: BookShellProps) {
  // Book proportions — portrait pages, double spread
  const pageH   = height * 0.88;
  const pageW   = pageH * 0.72;          // single page width (portrait ratio)
  const spine   = 44;                    // spine/binding strip
  const bookW   = pageW * 2 + spine;
  const cornerR = 3;                     // cover corner radius

  const spineTop    = darken(coverColor, 70);
  const spineBot    = darken(coverColor, 50);
  const coverDark   = darken(coverColor, 20);
  const coverLight  = lighten(coverColor, 18);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {/* ── Outer drop shadow ──────────────────────────────────────── */}
      <div
        style={{
          width:  bookW,
          height: pageH,
          position: "relative",
          filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.38)) drop-shadow(0 4px 10px rgba(0,0,0,0.22))",
        }}
      >

        {/* ══ FRONT COVER (left side of open book) ═══════════════════ */}
        <div
          style={{
            position:     "absolute",
            left:         0,
            top:          0,
            width:        pageW,
            height:       pageH,
            borderRadius: `${cornerR}px 0 0 ${cornerR}px`,
            overflow:     "hidden",
            background:   `linear-gradient(160deg, ${coverLight} 0%, ${coverColor} 40%, ${coverDark} 100%)`,
          }}
        >
          {/* Cover image as texture */}
          {coverName && (
            <div
              style={{
                position:           "absolute",
                inset:              0,
                backgroundImage:    `url(/stacks/cover/${coverName}.png)`,
                backgroundSize:     "cover",
                backgroundPosition: "center",
                opacity:            0.22,
                mixBlendMode:       "multiply",
              }}
            />
          )}

          {/* Cloth/linen texture overlay */}
          <div
            style={{
              position:  "absolute",
              inset:     0,
              background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,0.025) 2px,
                rgba(255,255,255,0.025) 4px
              ), repeating-linear-gradient(
                90deg,
                transparent,
                transparent 3px,
                rgba(0,0,0,0.018) 3px,
                rgba(0,0,0,0.018) 6px
              )`,
            }}
          />

          {/* Inner glow near spine */}
          <div
            style={{
              position: "absolute",
              top: 0, right: 0, bottom: 0,
              width: "35%",
              background: "linear-gradient(to right, rgba(0,0,0,0.18), rgba(0,0,0,0.04))",
            }}
          />

          {/* Page-edge curl shadow on right side */}
          <div
            style={{
              position: "absolute",
              top: 0, right: 0, bottom: 0,
              width: 28,
              background: "linear-gradient(to right, rgba(0,0,0,0.22), rgba(0,0,0,0.0))",
            }}
          />

          {/* Corner reinforcement marks — top-left */}
          <div style={{ position: "absolute", top: 10, left: 10, width: 18, height: 18,
            border: `1.5px solid rgba(255,255,255,0.18)`, borderRadius: 1 }} />
          {/* bottom-left */}
          <div style={{ position: "absolute", bottom: 10, left: 10, width: 18, height: 18,
            border: `1.5px solid rgba(255,255,255,0.18)`, borderRadius: 1 }} />
        </div>

        {/* ══ SPINE (center strip) ════════════════════════════════════ */}
        <div
          style={{
            position:   "absolute",
            left:       pageW,
            top:        0,
            width:      spine,
            height:     pageH,
            background: `linear-gradient(to right, ${spineTop}, ${spineBot} 30%, ${darken(coverColor,60)} 50%, ${spineBot} 70%, ${spineTop})`,
            display:    "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {/* Binding seam lines */}
          {[0.18, 0.82].map((t) => (
            <div
              key={t}
              style={{
                position:  "absolute",
                top:       `${t * 100}%`,
                left:      6,
                right:     6,
                height:    1,
                background: "rgba(0,0,0,0.3)",
                borderRadius: 1,
              }}
            />
          ))}
          {/* Highlight stripe */}
          <div
            style={{
              position: "absolute",
              top: 0, bottom: 0,
              left: spine * 0.42,
              width: 3,
              background: "linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0.04), rgba(255,255,255,0.12))",
            }}
          />
        </div>

        {/* ══ BACK COVER (right side — inside back) ══════════════════ */}
        <div
          style={{
            position:     "absolute",
            left:         pageW + spine,
            top:          0,
            width:        pageW,
            height:       pageH,
            borderRadius: `0 ${cornerR}px ${cornerR}px 0`,
            overflow:     "hidden",
            background:   `linear-gradient(160deg, ${lighten(coverColor,10)} 0%, ${coverColor} 60%, ${coverDark} 100%)`,
          }}
        >
          {/* Same cloth texture */}
          <div
            style={{
              position:  "absolute",
              inset:     0,
              background: `repeating-linear-gradient(
                0deg, transparent, transparent 2px,
                rgba(255,255,255,0.025) 2px, rgba(255,255,255,0.025) 4px
              ), repeating-linear-gradient(
                90deg, transparent, transparent 3px,
                rgba(0,0,0,0.018) 3px, rgba(0,0,0,0.018) 6px
              )`,
            }}
          />

          {/* Shadow near spine */}
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, bottom: 0,
              width: "30%",
              background: "linear-gradient(to left, rgba(0,0,0,0.0), rgba(0,0,0,0.15))",
            }}
          />

          {/* Page-edge curl on left edge */}
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, bottom: 0,
              width: 24,
              background: "linear-gradient(to left, rgba(0,0,0,0.0), rgba(0,0,0,0.20))",
            }}
          />

          {/* Corner reinforcements — top-right */}
          <div style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18,
            border: `1.5px solid rgba(255,255,255,0.15)`, borderRadius: 1 }} />
          {/* bottom-right */}
          <div style={{ position: "absolute", bottom: 10, right: 10, width: 18, height: 18,
            border: `1.5px solid rgba(255,255,255,0.15)`, borderRadius: 1 }} />
        </div>

        {/* ── Simulated page-block edge under the covers (bottom) ─── */}
        <div
          style={{
            position:     "absolute",
            left:         4,
            right:        4,
            bottom:       -5,
            height:       8,
            background:   "linear-gradient(to bottom, #e8e0d8, #d4ccc4)",
            borderRadius: "0 0 3px 3px",
            boxShadow:    "0 3px 8px rgba(0,0,0,0.25)",
          }}
        />
        {/* page-block right edge */}
        <div
          style={{
            position:     "absolute",
            right:        -5,
            top:          4,
            bottom:       4,
            width:        8,
            background:   "linear-gradient(to right, #ddd6ce, #ccc4bc)",
            borderRadius: "0 3px 3px 0",
            boxShadow:    "3px 0 8px rgba(0,0,0,0.2)",
          }}
        />
      </div>
    </div>
  );
}
