import Link from "next/link";
import { siteConfig } from "../../lib/site-config";
import { LogoMark } from "../../lib/logo-marks";

type TrustPageLayoutProps = {
  title: string;
  updated: string;
  children: React.ReactNode;
};

export function TrustPageLayout({ title, updated, children }: TrustPageLayoutProps) {
  return (
    <div className="page">
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="logo" href="/">
            <LogoMark />
            {siteConfig.name}
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/security">Security</Link>
            <a className="nav-cta" href={siteConfig.appUrl}>
              Open app
            </a>
          </nav>
        </div>
      </header>

      <main className="trust-page shell">
        <p className="trust-eyebrow">Trust center</p>
        <h1>{title}</h1>
        <p className="trust-updated">Last updated {updated}</p>
        {children}
        <p className="trust-related">
          See also{" "}
          <Link href="/privacy">Privacy</Link>
          {" · "}
          <Link href="/terms">Terms</Link>
          {" · "}
          <Link href="/security">Security</Link>
        </p>
      </main>

      <footer className="site-footer shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="logo" href="/">
              <LogoMark />
              {siteConfig.name}
            </Link>
            <p>Operational memory for vehicle ownership.</p>
          </div>
          <div className="footer-col">
            <h3>Trust</h3>
            <ul>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
              <li>
                <Link href="/terms">Terms</Link>
              </li>
              <li>
                <Link href="/security">Security</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Product</h3>
            <ul>
              <li>
                <a href={siteConfig.appUrl}>Open app</a>
              </li>
              <li>
                <Link href="/#demo">Demo</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Connect</h3>
            <ul>
              <li>
                <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
              </li>
              <li>
                <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                  GitHub
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

type TrustSectionProps = {
  id: string;
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

export function TrustSection({ id, title, paragraphs, bullets }: TrustSectionProps) {
  return (
    <section className="trust-section" id={id}>
      <h2>{title}</h2>
      {paragraphs?.map((paragraph, index) => (
        <p key={`${id}-p-${index}`}>{paragraph}</p>
      ))}
      {bullets ? (
        <ul>
          {bullets.map((item, index) => (
            <li key={`${id}-b-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
