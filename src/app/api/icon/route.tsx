import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const ICON_SVG = `
  <rect x="150" y="156" width="212" height="252" rx="28" fill="#ffffff"/>
  <rect x="206" y="120" width="100" height="52" rx="16" fill="#ffffff"/>
  <rect x="222" y="128" width="68" height="36" rx="10" fill="#059669"/>
  <line x1="192" y1="238" x2="320" y2="238" stroke="#059669" stroke-width="22" stroke-linecap="round"/>
  <line x1="192" y1="290" x2="320" y2="290" stroke="#059669" stroke-width="22" stroke-linecap="round"/>
  <line x1="192" y1="342" x2="272" y2="342" stroke="#059669" stroke-width="22" stroke-linecap="round"/>
`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sizeStr = searchParams.get("size") || "512";
  const size = parseInt(sizeStr, 10);
  const s = Math.min(Math.max(size, 16), 1024);
  const svgScale = s * 0.65;
  const radius = Math.round(s * 0.15);

  return new ImageResponse(
    (
      <div
        style={{
          width: s,
          height: s,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#059669",
          borderRadius: radius,
        }}
      >
        <svg
          width={svgScale}
          height={svgScale}
          viewBox="140 110 232 308"
          dangerouslySetInnerHTML={{ __html: ICON_SVG }}
        />
      </div>
    ),
    {
      width: s,
      height: s,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
