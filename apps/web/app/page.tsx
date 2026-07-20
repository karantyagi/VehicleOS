import Link from "next/link";
import { siteConfig } from "../lib/site-config";
import { LogoMark } from "../lib/logo-mark";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="app-header">
        <a className="logo" href={siteConfig.marketingUrl}>
          <LogoMark />
          {siteConfig.name}
        </a>
        <Link className="header-link" href="/golden-path">
          Run golden path
        </Link>
        <Link className="header-link" href={`${siteConfig.marketingUrl}/#demo`}>
          Watch demo
        </Link>
      </header>

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
    </main>
  );
}
