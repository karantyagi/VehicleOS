import Image from "next/image";
import {
  adrs,
  aiNativeBlurb,
  coreLoopSteps,
  heroContent,
  siteConfig,
  statusRows,
  trustSignals,
} from "../lib/site-config";

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 14 14" fill="none">
        <path
          d="M2 7h10M7 2v10"
          stroke="#04140b"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
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
            <a href="#loop">How it works</a>
            <a href="#demo">Demo</a>
            <a href="#architecture">Architecture</a>
            <a href="#status">Roadmap</a>
            <a className="nav-cta" href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
              GitHub
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
              <span className="pill">Open core · MIT</span>
              <span className="pill">AI-native architecture</span>
            </div>

            <h1>
              Operational memory for{" "}
              <span className="highlight">{heroContent.headlineHighlight}</span>
            </h1>

            <p className="hero-hook">
              <span className="hero-hook-ai">Explainable AI</span> maintenance for vehicle ownership
            </p>

            <p className="hero-sub">{heroContent.problem}</p>
            <p className="hero-proof">{heroContent.oneLiner}</p>

            <div className="cta-row">
              <a className="btn btn-primary" href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                View source
                <ExternalIcon />
              </a>
              <a className="btn btn-secondary" href={siteConfig.linkedInUrl} target="_blank" rel="noreferrer">
                Get in touch
              </a>
            </div>

            <div className="trust-strip">
              {trustSignals.map((signal) => (
                <div className="trust-item" key={signal.label}>
                  <strong>{signal.label}</strong>
                  <span>{signal.detail}</span>
                </div>
              ))}
            </div>
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
          <h2>Explore the codebase</h2>
          <p>Open source core. Hosted product on the roadmap.</p>
          <div className="cta-row">
            <a className="btn btn-primary" href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
              GitHub
              <ExternalIcon />
            </a>
            <a className="btn btn-secondary" href={siteConfig.linkedInUrl} target="_blank" rel="noreferrer">
              LinkedIn
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
              Operational memory for vehicle ownership. MIT open core with a hosted
              product layer.
            </p>
          </div>
          <div className="footer-col">
            <h3>Product</h3>
            <ul>
              <li><a href="#loop">How it works</a></li>
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
