import { ImageResponse } from "next/og";
import { OrbitIcon } from "../../../packages/ui/src/logo-mark";

export const runtime = "edge";
export const alt = "VehicleOS — Operational memory for vehicle ownership";
export const size = { width: 1280, height: 640 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background: "linear-gradient(160deg, #131316 0%, #09090b 55%, #0f0f12 100%)",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <OrbitIcon size={28} ringOpacity={0.9} />
          </div>
          <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em" }}>VehicleOS</span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 52,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.035em",
            maxWidth: 900,
          }}
        >
          Operational memory for long-lived ownership
        </p>
        <p style={{ margin: "20px 0 0", fontSize: 26, color: "#a1a1aa", maxWidth: 820, lineHeight: 1.4 }}>
          Explainable AI maintenance · Event-sourced · Rules-first
        </p>
      </div>
    ),
    { ...size }
  );
}
