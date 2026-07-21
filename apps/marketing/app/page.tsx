import Image from "next/image";
import {
  adrs,
  aiNativeBlurb,
  coreLoopSteps,
  earlyAccessContent,
  heroContent,
  siteConfig,
  statusRows,
  trustSignals,
} from "../lib/site-config";
import { LogoMark } from "../lib/logo-marks";
import { PositioningGapSection } from "./components/positioning-gap-section";

function DemoSection() {
  const hasDemo = Boolean(siteConfig.demoLoomUrl);

  if (hasDemo) {
    return (
      <div className="demo-player">
        <div className="demo-chrome">
          <span className="demo-dot" />
          <span className="demo-dot" />
          <span className="demo-dot" />
          <span className="demo-url">{siteConfig.appUrl}/dashboard</span>
        </div>
        <div className="demo-embed">
          <iframe
            src={siteConfig.demoLoomUrl}
            allowFullScreen
            title="VehicleOS product walkthrough"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="demo-player">
      <div className="demo-chrome">
        <span className="demo-dot" />
        <span className="demo-dot" />
        <span className="demo-dot" />
        <span className="demo-url">{siteConfig.appUrl}/dashboard</span>
      </div>
      <div className="demo-body">
        <div className="demo-play" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 5l10 5-10 5V5z" />
          </svg>
        </div>
        <h3>Product walkthrough</h3>
        <p>Full demo recording ships with v1 core loop.</p>
        <span className="coming-soon">Coming soon</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "shipped" | "in-progress" | "planned" }) {
  const labels = {
    shipped: "Shipped",
    "in-progress": "In progress",
    planned: "Planned",
  };

  return (
    <span className={`status-badge status-${status}`}>{labels[status]}</span>
  );
}

export default function HomePage() {
  return (
    <div className="page">
      <header className="site-header">
        <div className="shell header-inner">
          <a className="logo" href="#top">
            <LogoMark />
            {siteConfig.name}
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="#early-access">Early access</a>
            <a href="#loop">How it works</a>
            <a href="#architecture">Architecture</a>
            <a href="#status">Roadmap</a>
            <a className="nav-cta" href={siteConfig.appUrl}>
              Open the app
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero shell-wide" id="top">
          <div className="hero-grid-bg" aria-hidden="true" />
          <div className="hero-content">
            <div className="pill-row">
              <span className="pill">
                <span className="pill-dot" />
                In active development
              </span>
              <span className="pill">Free early access</span>
              <span className="pill">Event-sourced</span>
              <span className="pill">Rules-first AI</span>
            </div>

            <h1>
              {heroContent.headline}{" "}
              <span className="highlight">{heroContent.headlineHighlight}</span>
            </h1>

            <p className="hero-hook">
              <span className="hero-hook-ai">Explainable AI</span> maintenance for vehicle ownership
            </p>

            <p className="hero-outcome">{heroContent.outcomeLine}</p>
            <p className="hero-engineering">{heroContent.engineeringLine}</p>

            <p className="hero-sub">{heroContent.problem}</p>
            <p className="hero-proof">{heroContent.oneLiner}</p>

            <div className="cta-row">
              <a className="btn btn-primary" href={siteConfig.appUrl}>
                Get early access
              </a>
              <a className="btn btn-secondary" href="#demo">
                Watch demo
              </a>
            </div>
          </div>

          <div className="trust-strip">
            {trustSignals.map((signal) => (
              <div className="trust-item" key={signal.label}>
                <strong>{signal.label}</strong>
                <span>{signal.detail}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section shell" id="early-access">
          <div className="section-header-centered">
            <span className="section-label">{earlyAccessContent.sectionLabel}</span>
            <h2>{earlyAccessContent.sectionTitle}</h2>
            <p className="section-desc">{earlyAccessContent.sectionDesc}</p>
            <p className="section-desc">{earlyAccessContent.wedge}</p>
          </div>

          <article className="path-card path-card-owners path-card-single">
            <div className="path-card-header">
              <span className="path-badge path-badge-owners">Owners</span>
              <span className="path-price">{earlyAccessContent.priceNote}</span>
            </div>
            <ul className="path-highlights">
              {earlyAccessContent.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="path-cta-row">
              <a
                className="btn btn-primary path-cta"
                href={earlyAccessContent.cta.href}
              >
                {earlyAccessContent.cta.label}
              </a>
              <a className="path-cta-secondary" href={earlyAccessContent.ctaSecondary.href}>
                {earlyAccessContent.ctaSecondary.label}
              </a>
            </div>
          </article>
        </section>

        <PositioningGapSection />

        <section className="section shell" id="loop">
          <div className="section-header-centered">
            <span className="section-label">System design</span>
            <h2>The core loop</h2>
            <p className="section-desc">
              Evidence becomes durable state. Deterministic policy drives actions.
              Memory keeps context — so you never re-explain your car from scratch.
            </p>
          </div>

          <div className="pipeline">
            {coreLoopSteps.map((step, index) => (
              <div className="pipeline-step" key={step.label}>
                <div className="pipeline-num">{String(index + 1).padStart(2, "0")}</div>
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </div>
            ))}
          </div>

          <div className="diagram-frame">
            <div className="diagram-frame-header">
              <span className="diagram-frame-title">input → decision → output</span>
            </div>
            <Image
              src="/diagrams/core-loop.svg"
              alt="Input decision output diagram: vehicle profile, receipts, and price data flow through a decision layer to due actions, path recommendations, and cost rationale"
              width={960}
              height={400}
              priority
            />
          </div>
        </section>

        <section className="section shell" id="demo">
          <div className="section-header-centered">
            <span className="section-label">Product</span>
            <h2>See it in action</h2>
            <p className="section-desc">
              First vertical slice: receipt upload → extraction → service.recorded →
              recommendation → user approval.
            </p>
          </div>

          <DemoSection />
        </section>

        <section className="section shell" id="architecture">
          <span className="section-label">Engineering</span>
          <h2>Architecture built for explainability</h2>
          <p className="section-desc">
            Rules own truth. LLMs handle extraction and explanation on async paths only.
            Event sourcing gives auditability from day one — not bolted on later.
          </p>

          <div className="diagram-frame">
            <div className="diagram-frame-header">
              <span className="diagram-frame-title">engineering view · apps · api · worker · data</span>
            </div>
            <Image
              src="/diagrams/architecture.svg"
              alt="Engineering architecture view: user app, API tier, queue, workers, scheduler, OLTP store, and AI extraction paths"
              width={960}
              height={520}
            />
          </div>

          <div className="adr-grid">
            {adrs.map((adr) => (
              <a className="adr-card" href={adr.href} key={adr.id} target="_blank" rel="noreferrer">
                <div className="adr-card-content">
                  <strong>{adr.title}</strong>
                  <span>{adr.id} · Architecture decision record</span>
                </div>
                <span className="adr-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="section shell" id="built-ai-native">
          <div className="section-header-centered">
            <span className="section-label">Operating model</span>
            <h2>Built AI-native</h2>
            <p className="section-desc">
              Human-led architecture. Agent-assisted implementation. ADRs as the contract.
            </p>
          </div>
          <div className="ai-native-card">
            <p>{aiNativeBlurb}</p>
            <div className="ai-native-tags">
              <span>human architect</span>
              <span>cursor agents</span>
              <span>ADRs</span>
              <span>deterministic policy</span>
              <span>async LLM paths</span>
            </div>
          </div>
        </section>

        <section className="section shell" id="status">
          <span className="section-label">Transparency</span>
          <h2>What&apos;s shipped, in progress, and planned</h2>
          <p className="section-desc">
            No inflated metrics. Status updates with each version tag.
          </p>

          <div className="status-card">
            <table className="status-table">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {statusRows.map((row) => (
                  <tr key={row.item}>
                    <td>{row.item}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cta-band shell">
          <h2>Try free early access</h2>
          <p>Sign in at app.vehicleos.app — or explore the architecture and ADRs below.</p>
          <div className="cta-row">
            <a className="btn btn-primary" href={siteConfig.appUrl}>
              Open the app
            </a>
            <a className="btn btn-secondary" href="#architecture">
              See architecture
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <a className="logo" href="#top">
            <LogoMark />
              {siteConfig.name}
            </a>
            <p>
              Operational memory for vehicle ownership. Free early access at{" "}
              {siteConfig.appUrl.replace("https://", "")}.
            </p>
          </div>
          <div className="footer-col">
            <h3>Product</h3>
            <ul>
              <li><a href={siteConfig.appUrl}>Early access app</a></li>
              <li><a href="#early-access">What's included</a></li>
              <li><a href="#demo">Demo</a></li>
              <li><a href="#status">Roadmap</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Trust</h3>
            <ul>
              <li><a href="/privacy">Privacy</a></li>
              <li><a href="/security">Security</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>For engineers</h3>
            <ul>
              <li>
                <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                  GitHub — ADRs &amp; architecture
                </a>
              </li>
              <li><a href="#architecture">Architecture</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Connect</h3>
            <ul>
              <li>
                <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-meta">
          <span>© 2026 {siteConfig.name}</span>
          <span>Hosted product → {siteConfig.appUrl}</span>
        </div>
      </footer>
    </div>
  );
}
