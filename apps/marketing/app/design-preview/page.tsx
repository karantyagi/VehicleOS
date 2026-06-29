import Link from "next/link";
import {
  heroContent,
  productPathsContent,
  siteConfig,
} from "../../lib/site-config";
import { LogoMark } from "../../lib/logo-marks";
import "./preview.css";

function ShippedDemo() {
  return (
    <div className="demo-player preview-block">
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

export default function DesignPreviewPage() {
  const ownersPath = productPathsContent.paths.find((p) => p.id === "owners");

  return (
    <div className="page preview-page">
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="logo" href="/">
            <LogoMark />
            {siteConfig.name}
          </Link>
          <nav className="nav-links">
            <Link href="/">← Main site</Link>
            <a href={`${siteConfig.appUrl}/design-preview`}>Product design preview</a>
          </nav>
        </div>
      </header>

      <main className="shell preview-main">
        <div className="preview-banner">
          <strong>Current marketing design</strong> — matches{" "}
          <Link href="/">the main site</Link>. Closed decisions are locked here as reference.
          New experiments go on this page first, then promote to main.
        </div>

        <section className="preview-section">
          <span className="section-label">Brand</span>
          <h2>Logo · Direction C (orbit)</h2>
          <p className="section-desc">
            Interim mark until an external logo platform. Ring + dot on polished green square.
          </p>
          <div className="shipped-card">
            <div className="shipped-row">
              <span className="shipped-label">Header</span>
              <span className="logo preview-logo-inline">
                <LogoMark />
                {siteConfig.name}
              </span>
            </div>
            <div className="shipped-row">
              <span className="shipped-label">Favicon</span>
              <LogoMark className="logo-mark logo-mark-favicon" />
            </div>
            <div className="shipped-row">
              <span className="shipped-label">OG image</span>
              <span className="shipped-mono">/opengraph-image · 1280×640</span>
            </div>
          </div>
        </section>

        <section className="preview-section">
          <span className="section-label">Color</span>
          <h2>Polished green accent</h2>
          <div className="shipped-card">
            <div className="swatch-row">
              <span className="swatch" style={{ background: "#22c55e" }} />
              <span className="swatch" style={{ background: "#16a34a" }} />
              <span>Primary · strong</span>
            </div>
            <p className="shipped-note">Owners path top border uses the same green family.</p>
            {ownersPath ? (
              <article className="path-card path-card-owners preview-path-single">
                <div className="path-card-header">
                  <span className="path-badge path-badge-owners">{ownersPath.badge}</span>
                  <span className="path-price">{ownersPath.priceNote}</span>
                </div>
                <h3>{ownersPath.title}</h3>
                <p className="path-tagline">{ownersPath.tagline}</p>
              </article>
            ) : null}
          </div>
        </section>

        <section className="preview-section">
          <span className="section-label">Hero</span>
          <h2>Dual-signal stack + CTAs</h2>
          <div className="shipped-card hero-specimen">
            <div className="pill-row">
              <span className="pill">
                <span className="pill-dot" />
                In active development
              </span>
              <span className="pill">MIT open core</span>
              <span className="pill">Event-sourced</span>
              <span className="pill">Rules-first AI</span>
            </div>
            <h3 className="hero-specimen-title">
              {heroContent.headline}{" "}
              <span className="highlight">{heroContent.headlineHighlight}</span>
            </h3>
            <p className="hero-hook">
              <span className="hero-hook-ai">Explainable AI</span> maintenance for vehicle ownership
            </p>
            <p className="hero-outcome">{heroContent.outcomeLine}</p>
            <div className="cta-row preview-cta-row">
              <span className="btn btn-primary">Choose your path</span>
              <span className="btn btn-secondary">See architecture</span>
            </div>
            <p className="shipped-note">Nav CTA: Watch demo → #demo</p>
          </div>
        </section>

        <section className="preview-section">
          <span className="section-label">Demo</span>
          <h2>#demo block (shipped)</h2>
          <ShippedDemo />
        </section>

        <section className="preview-section preview-footer-note">
          <p className="section-desc">
            Product shell (light theme, Owner copy) →{" "}
            <a href={`${siteConfig.appUrl}/design-preview`}>
              {siteConfig.appUrl}/design-preview
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
