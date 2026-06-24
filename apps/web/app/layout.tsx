import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "VehicleOS",
  description: "AI operations center for vehicle ownership"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
