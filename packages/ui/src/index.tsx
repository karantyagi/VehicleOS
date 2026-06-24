import type { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren) {
  return <section style={{ border: "1px solid #d0d7de", borderRadius: 10, padding: 16 }}>{children}</section>;
}
