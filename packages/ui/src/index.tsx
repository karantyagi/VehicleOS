import type { PropsWithChildren } from "react";

export { LogoMark, OrbitIcon } from "./logo-mark";
export type { OrbitIconProps } from "./logo-mark";

export function Card({ children }: PropsWithChildren) {
  return <section className="vos-card">{children}</section>;
}
