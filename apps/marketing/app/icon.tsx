import { ImageResponse } from "next/og";
import { OrbitIcon } from "../../../packages/ui/src/logo-mark";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
        }}
      >
        <OrbitIcon ringOpacity={0.9} />
      </div>
    ),
    { ...size }
  );
}
