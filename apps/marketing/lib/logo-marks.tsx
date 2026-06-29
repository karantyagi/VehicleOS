import type { ReactNode } from "react";
import { OrbitIcon } from "../../../packages/ui/src/logo-mark";

export type LogoVariant = "original" | "timeline" | "monogram" | "orbit";

type LogoMarkProps = {
  variant?: LogoVariant;
  className?: string;
};

export function LogoMark({ variant = "orbit", className = "logo-mark" }: LogoMarkProps) {
  return (
    <span className={className} aria-hidden="true">
      {logoSvgByVariant[variant]}
    </span>
  );
}

const logoSvgByVariant: Record<LogoVariant, ReactNode> = {
  original: (
    <svg viewBox="0 0 14 14" fill="none">
      <path
        d="M2 7h10M7 2v10"
        stroke="#04140b"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  timeline: (
    <svg viewBox="0 0 14 14" fill="none">
      <rect x="2" y="3" width="10" height="1.5" rx="0.75" fill="#fafafa" opacity="0.95" />
      <rect x="2" y="6.25" width="7" height="1.5" rx="0.75" fill="#fafafa" opacity="0.7" />
      <rect x="2" y="9.5" width="4" height="1.5" rx="0.75" fill="#fafafa" opacity="0.45" />
    </svg>
  ),
  monogram: (
    <svg viewBox="0 0 14 14" fill="none">
      <path
        d="M2.5 3.5 L7 10 L11.5 3.5"
        stroke="#04140b"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.25" cy="10.25" r="2.1" stroke="#04140b" strokeWidth="1.35" fill="none" />
    </svg>
  ),
  orbit: <OrbitIcon />,
};

export const logoMeta: Record<
  LogoVariant,
  { id: string; label: string; direction: string; note: string }
> = {
  original: {
    id: "original",
    label: "Original",
    direction: "Cross mark",
    note: "Shipped before Phase 1 — green gradient square.",
  },
  timeline: {
    id: "timeline",
    label: "Direction A",
    direction: "Timeline",
    note: "Stacked bars — operational memory / event stream.",
  },
  monogram: {
    id: "monogram",
    label: "Direction B",
    direction: "VO monogram",
    note: "Geometric V + O — your current pick to evaluate.",
  },
  orbit: {
    id: "orbit",
    label: "Direction C",
    direction: "Orbit ring",
    note: "Ring + dot — long-lived ownership. Shipped on main site.",
  },
};
