import { ImageResponse } from "next/og";
import { PwaIconMark, pwaIconBackground } from "../lib/pwa-icon-mark";

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
          borderRadius: 7,
          ...pwaIconBackground,
        }}
      >
        <PwaIconMark size={20} orbitRadius={6} strokeWidth={1.8} dotRadius={2} />
      </div>
    ),
    size,
  );
}
