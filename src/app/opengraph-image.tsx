import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** One dynamic OG image for the whole site (AUDIT_REPORT.md G2-2) — pages that want their own
 * just add a sibling opengraph-image.tsx in that route segment; nothing else needs to change,
 * Next's file convention resolves the nearest one. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b1220",
          color: "#e6ebf5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>Altpitch</div>
        </div>
        <div style={{ fontSize: 30, color: "#9aa7bd" }}>Judgment, not generation.</div>
      </div>
    ),
    { ...size }
  );
}
