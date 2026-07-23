/** Shared orbit mark for generated favicon / apple-touch PNGs. */

type PwaIconMarkProps = {
  size: number;
  orbitRadius: number;
  strokeWidth: number;
  dotRadius: number;
};

export const PwaIconMark = ({ size, orbitRadius, strokeWidth, dotRadius }: PwaIconMarkProps) => {
  const center = size / 2;
  const dotCx = center + orbitRadius * 0.65;
  const dotCy = center - orbitRadius * 0.45;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={orbitRadius}
        fill="none"
        stroke="#fafafa"
        strokeWidth={strokeWidth}
        opacity={0.88}
      />
      <circle cx={dotCx} cy={dotCy} r={dotRadius} fill="#fafafa" />
    </svg>
  );
};

export const pwaIconBackground = {
  background: "linear-gradient(135deg, #3cb371 0%, #1a6b4a 100%)",
} as const;
