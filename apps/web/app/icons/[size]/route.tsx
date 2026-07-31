import { ImageResponse } from "next/og";
import { PwaIconMark, pwaIconBackground } from "../../../lib/pwa-icon-mark";

export const runtime = "edge";

const supportedSizes = new Set([192, 512]);

export function GET(_: Request, { params }: { params: { size: string } }) {
  const size = Number(params.size);
  if (!supportedSizes.has(size)) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: Math.round(size * 0.22),
          ...pwaIconBackground,
        }}
      >
        <PwaIconMark
          size={Math.round(size * 0.62)}
          orbitRadius={Math.round(size * 0.19)}
          strokeWidth={Math.round(size * 0.05)}
          dotRadius={Math.round(size * 0.06)}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
