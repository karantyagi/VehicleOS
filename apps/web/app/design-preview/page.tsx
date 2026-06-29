import Link from "next/link";
import { siteConfig } from "../../lib/site-config";
import { LogoMark } from "../../lib/logo-mark";
import "./preview.css";

export default function ProductDesignPreviewPage() {
  return (
    <main className="shell preview-shell">
      <header className="app-header">
        <Link className="logo" href="/">
          <LogoMark />
          {siteConfig.name}
        </Link>
        <div className="header-links">
          <Link className="header-link" href="/">
            ← Main site
          </Link>
          <a className="header-link" href={`${siteConfig.marketingUrl}/design-preview`}>
            Marketing design preview
          </a>
        </div>
      </header>

      <div className="preview-note">
        <strong>Current product design</strong> — matches{" "}
        <Link href="/">the main app shell</Link>. Light theme · Logo C (orbit) · Owner-facing
        copy. New experiments land here before promoting to main.{" "}
        <Link href="/design-preview/empty-state">Empty state A vs B</Link>
        {" · "}
        <Link href="/design-preview/product-mock">Mobile mock</Link>
        {" · "}
        <Link href="/design-preview/web-mock">Web mock →</Link>
      </div>

      <section className="hero">
        <p className="eyebrow">Owners · Free early access</p>
        <h1>Your car, remembered.</h1>
        <p>
          Upload a receipt, confirm what we extracted, and see what&apos;s due next —
          with plain-English explanations you can trust.
        </p>
      </section>

      <section className="grid" aria-label="How VehicleOS works">
        <article className="feature-card accent-owners">
          <h2>Complete timeline</h2>
          <p>
            Receipts, mileage, and service history in one place — a complete
            timeline that doesn&apos;t forget.
          </p>
        </article>
        <article className="feature-card accent-rules">
          <h2>Smart reminders</h2>
          <p>
            What&apos;s due before it&apos;s urgent — with time to plan, not panic.
          </p>
        </article>
        <article className="feature-card accent-ai">
          <h2>Clear answers</h2>
          <p>
            AI reads your receipt and explains recommendations — you confirm
            before anything changes.
          </p>
        </article>
      </section>

      <section className="preview-spec">
        <h2 className="preview-spec-title">Shipped tokens</h2>
        <ul className="preview-spec-list">
          <li>Background: warm off-white (#f4f2ec)</li>
          <li>Accent: forest green + bright green (#0b6f45 / #22c55e)</li>
          <li>Typography: Inter + JetBrains Mono</li>
          <li>Header CTA: Watch demo → marketing #demo</li>
        </ul>
      </section>
    </main>
  );
}
