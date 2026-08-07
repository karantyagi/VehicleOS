import {
  coreLoopSteps,
  demoContent,
  earlyAccessContent,
  heroContent,
  heroPills,
  loopContent,
  releaseNote,
  setupSteps,
  siteConfig,
  trustSignals,
} from "../lib/site-config";
import { LogoMark } from "../lib/logo-marks";
import { FeaturesSection } from "./components/features-section";
import { RevealOnScroll } from "./components/scroll-reveal";
import { VehicleSupportCheck } from "./components/vehicle-support-check";

function DemoSection() {
  const hasDemo = Boolean(siteConfig.demoLoomUrl);

  if (hasDemo) {
    return (
      <div className="demo-player reveal-card">
        <div className="demo-chrome">
          <span className="demo-dot" />
          <span className="demo-dot" />
          <span className="demo-dot" />
          <span className="demo-url">{siteConfig.appUrl}/</span>
        </div>
        <div className="demo-embed">
          <iframe src={siteConfig.demoLoomUrl} allowFullScreen title="VehicleOS product walkthrough" />
        </div>
      </div>
    );
  }

  return (
    <div className="demo-player reveal-card">
      <div className="demo-chrome">
        <span className="demo-dot" />
        <span className="demo-dot" />
        <span className="demo-dot" />
        <span className="demo-url">{siteConfig.appUrl}/</span>
      </div>
      <div className="demo-body">
        <div className="demo-play" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 5l10 5-10 5V5z" />
          </svg>
        </div>
        <h3>{demoContent.placeholderTitle}</h3>
        <p>{demoContent.placeholderDetail}</p>
        <span className="coming-soon">Coming soon</span>
      </div>
    </div>
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
            <a href="#features">Features</a>
            <a href="#early-access">Start</a>
            <a href="#loop">How it works</a>
            <a href="#demo">Demo</a>
            <a className="nav-cta" href="#supported">
              Check your car
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero shell-wide" id="top">
          <div className="hero-grid-bg" aria-hidden="true" />
          <div className="hero-content">
            <RevealOnScroll>
              <div className="pill-row">
                {heroPills.map((pill) => (
                  <span className="pill" key={pill}>
                    {pill === heroPills[0] ? (
                      <>
                        <span className="pill-dot" />
                        {pill}
                      </>
                    ) : (
                      pill
                    )}
                  </span>
                ))}
              </div>

              <h1 className="hero-headline">
                {heroContent.headline} <span className="highlight highlight-animated">{heroContent.headlineHighlight}</span>
              </h1>

              <p className="hero-hook">{heroContent.hook}</p>
              <p className="hero-sub">{heroContent.subline}</p>

              <div className="cta-row">
                <a className="btn btn-primary" href="#supported">
                  Check your car
                </a>
              </div>
              <p className="hero-cta-note">{releaseNote.detail}</p>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay={120}>
            <div className="trust-strip">
              {trustSignals.map((signal) => (
                <div className="trust-item reveal-card" key={signal.label}>
                  <strong>{signal.label}</strong>
                  <span>{signal.detail}</span>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </section>

        <FeaturesSection />

        <section className="section shell" id="early-access">
          <RevealOnScroll>
            <div className="section-header-centered">
              <span className="section-label">{earlyAccessContent.sectionLabel}</span>
              <h2>{earlyAccessContent.sectionTitle}</h2>
              <p className="section-desc">{earlyAccessContent.sectionDesc}</p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={80}>
            <ol className="setup-steps-grid setup-steps-compact">
              {setupSteps.map((step) => (
                <li key={step.step} className="setup-step reveal-card">
                  <span className="setup-step-num">{step.step}</span>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </li>
              ))}
            </ol>
          </RevealOnScroll>

          <RevealOnScroll delay={120}>
            <VehicleSupportCheck />
          </RevealOnScroll>
        </section>

        <section className="section shell" id="loop">
          <RevealOnScroll>
            <div className="section-header-centered">
              <span className="section-label">{loopContent.sectionLabel}</span>
              <h2>{loopContent.sectionTitle}</h2>
              <p className="section-desc">{loopContent.sectionDesc}</p>
            </div>
          </RevealOnScroll>

          <div className="pipeline">
            {coreLoopSteps.map((step, index) => (
              <RevealOnScroll key={step.label} delay={index * 55} className="pipeline-reveal">
                <div className="pipeline-step reveal-card">
                  <div className="pipeline-num">{String(index + 1).padStart(2, "0")}</div>
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          <RevealOnScroll delay={80}>
            <p className="diagram-lead">{loopContent.diagramCaption}</p>
          </RevealOnScroll>
        </section>

        <section className="section shell" id="demo">
          <RevealOnScroll>
            <div className="section-header-centered">
              <span className="section-label">{demoContent.sectionLabel}</span>
              <h2>{demoContent.sectionTitle}</h2>
              <p className="section-desc">{demoContent.sectionDesc}</p>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={60}>
            <DemoSection />
          </RevealOnScroll>
        </section>

        <section className="cta-band shell">
          <RevealOnScroll>
            <h2>Get a clearer next action.</h2>
            <p>Check whether your car is supported, then confirm the service history you know in the app.</p>
            <div className="cta-row">
              <a className="btn btn-primary" href="#supported">
                Check your car
              </a>
            </div>
          </RevealOnScroll>
        </section>
      </main>

      <footer className="site-footer shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <a className="logo" href="#top">
              <LogoMark />
              {siteConfig.name}
            </a>
            <p>{siteConfig.tagline}</p>
          </div>
          <div className="footer-col">
            <h3>Product</h3>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#supported">Your car</a>
              </li>
              <li>
                <a href={siteConfig.appUrl}>App</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Trust</h3>
            <ul>
              <li>
                <a href="/privacy">Privacy</a>
              </li>
              <li>
                <a href="/security">Security</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Transparency</h3>
            <ul>
              <li>
                <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                  GitHub · architecture and evaluation notes
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-meta">
          <span>© 2026 {siteConfig.name}</span>
          <span>{siteConfig.appUrl.replace("https://", "")}</span>
        </div>
      </footer>
    </div>
  );
}
