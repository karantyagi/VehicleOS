export function OrbitIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" width={size} height={size} aria-hidden>
      <circle cx="7" cy="7" r="4.25" stroke="#fafafa" strokeWidth="1.35" opacity="0.85" />
      <circle cx="9.75" cy="5.25" r="1.35" fill="#fafafa" />
    </svg>
  );
}

export function IconDue() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="#d97706" strokeWidth="1.5" />
      <path d="M10 5v5l3 2" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconAction() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="#2563eb" strokeWidth="1.5" />
      <path d="M7 8h6M7 11h4" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconRec() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7" stroke="#0b6f45" strokeWidth="1.4" />
      <path d="M10 6v4l2.5 1.5" stroke="#0b6f45" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconCamera() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="2" y="5" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconMic() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="8" y="3" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 11a6 6 0 0012 0M11 17v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function QueueIcon({ kind }: { kind: "due" | "action" | "recommendation" }) {
  if (kind === "due") return <IconDue />;
  if (kind === "action") return <IconAction />;
  return <IconRec />;
}

export function ProgressBar({
  value,
  tone,
  wide = false,
}: {
  value: number;
  tone: "amber" | "green";
  wide?: boolean;
}) {
  const color = tone === "amber" ? "var(--tone-due)" : "var(--tone-rec)";
  return (
    <div className={`progress${wide ? " progress-wide" : ""}`} aria-hidden>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}
