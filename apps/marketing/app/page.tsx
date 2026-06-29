import Image from "next/image";
import {
  adrs,
  aiNativeBlurb,
  coreLoopSteps,
  heroContent,
  productPathsContent,
  siteConfig,
  statusRows,
  trustSignals,
} from "../lib/site-config";
import { LogoMark } from "../lib/logo-marks";

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

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M4 10L10 4M10 4H5M10 4V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
            <a href="#paths">Owners &amp; Builders</a>
            <a href="#loop">How it works</a>
            <a href="#architecture">Architecture</a>
            <a href="#status">Roadmap</a>
            <a className="nav-cta" href="#demo">
              Watch demo
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
              <span className="pill">MIT open core</span>
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
              <a className="btn btn-primary" href="#paths">
                Choose your path
              </a>
              <a className="btn btn-secondary" href="#architecture">
                See architecture
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

        <section className="section shell" id="paths">
          <div className="section-header-centered">
            <span className="section-label">{productPathsContent.sectionLabel}</span>
            <h2>{productPathsContent.sectionTitle}</h2>
            <p className="section-desc">{productPathsContent.sectionDesc}</p>
          </div>

          <div className="path-grid">
            {productPathsContent.paths.map((path) => (
              <article
                className={`path-card path-card-${path.id}`}
                key={path.id}
                id={path.id}
              >
                <div className="path-card-header">
                  <span className={`path-badge path-badge-${path.id}`}>{path.badge}</span>
                  <span className="path-price">{path.priceNote}</span>
                </div>
                <h3>{path.title}</h3>
                <p className="path-tagline">{path.tagline}</p>
                <p className="path-desc">{path.description}</p>
                <ul className="path-highlights">
                  {path.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="path-cta-row">
                  <a
                    className={`btn ${path.id === "owners" ? "btn-primary" : "btn-secondary"} path-cta`}
                    href={path.cta.href}
                    target={path.id === "builders" ? "_blank" : undefined}
                    rel={path.id === "builders" ? "noreferrer" : undefined}
                  >
                    {path.cta.label}
                    {path.id === "builders" ? <ExternalIcon /> : null}
                  </a>
                  {"ctaSecondary" in path && path.ctaSecondary ? (
                    <a className="path-cta-secondary" href={path.ctaSecondary.href}>
                      {path.ctaSecondary.label}
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

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
          <h2>See the architecture — or run it yourself</h2>
          <p>Free early access for Owners. MIT open core for Builders.</p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#demo">
              Watch demo
            </a>
            <a className="btn btn-secondary" href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
              View on GitHub
              <ExternalIcon />
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
              Operational memory for vehicle ownership. Owners use the app. Builders run
              the open core.
            </p>
          </div>
          <div className="footer-col">
            <h3>Product</h3>
            <ul>
              <li><a href="#paths">Owners</a></li>
              <li><a href="#paths">Builders</a></li>
              <li><a href="#demo">Demo</a></li>
              <li><a href="#status">Roadmap</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Learn</h3>
            <ul>
              <li>
                <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                  Documentation
                </a>
              </li>
              <li><a href="#architecture">Architecture</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Connect</h3>
            <ul>
              <li>
                <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
              </li>
              <li>
                <a href={siteConfig.linkedInUrl} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
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
