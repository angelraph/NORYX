import { ImageResponse } from "next/og";

export const alt = "Noryx: Live onchain wallet security audit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#000000",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            color: "#6E54FF",
          }}
        >
          Noryx
        </div>
        <div
          style={{
            display: "flex",
            width: 160,
            height: 8,
            marginTop: 8,
            borderRadius: 4,
            background: "linear-gradient(90deg, #6E54FF, #85E6FF)",
          }}
        />
        <div style={{ display: "flex", marginTop: 24, fontSize: 40, color: "#ffffff" }}>
          Know exactly what your wallet has approved.
        </div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 28, color: "rgba(255,255,255,0.5)" }}>
          Live onchain wallet security audit &middot; Monad Mainnet
        </div>
      </div>
    ),
    { ...size },
  );
}
