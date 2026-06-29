/** Logo C (orbit ring) — interim mark until P2 #17 final logo. Canonical SVG for all surfaces. */

export type OrbitIconProps = {
  size?: number;
  stroke?: string;
  dotFill?: string;
  ringOpacity?: number;
};

export function OrbitIcon({
  size = 14,
  stroke = "#fafafa",
  dotFill = "#fafafa",
  ringOpacity = 0.85,
}: OrbitIconProps = {}) {
  return (
    <svg viewBox="0 0 14 14" fill="none" width={size} height={size} aria-hidden>
      <circle cx="7" cy="7" r="4.25" stroke={stroke} strokeWidth="1.35" opacity={ringOpacity} />
      <circle cx="9.75" cy="5.25" r="1.35" fill={dotFill} />
    </svg>
  );
}

export function LogoMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <OrbitIcon />
    </span>
  );
}
