import Link from "next/link";
import { siteConfig } from "../../../lib/site-config";
import { LogoMark } from "../../../lib/logo-mark";
import "../preview.css";
import "./empty-state.css";

function OrbitIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" width={size} height={size}>
      <circle cx="7" cy="7" r="4.25" stroke="#fafafa" strokeWidth="1.35" opacity="0.85" />
      <circle cx="9.75" cy="5.25" r="1.35" fill="#fafafa" />
    </svg>
  );
}

export default function EmptyStateComparisonPage() {
  return (
    <main className="empty-state-preview">
      <header className="app-header">
        <Link className="logo" href="/">
          <LogoMark />
          {siteConfig.name}
        </Link>
        <div className="header-links">
          <Link className="header-link" href="/design-preview">
            ← Design preview
          </Link>
        </div>
      </header>

      <div className="preview-intro">
        <strong>Empty state decision preview</strong> — Compare{" "}
        <strong>Option A (zero Reflect)</strong> vs{" "}
        <strong>Option B (branded moment, first visit only)</strong>. After the
        user adds a vehicle, both paths converge to the same calm dashboard (bottom).
        Open at{" "}
        <code>{`${siteConfig.appUrl}/design-preview/empty-state`}</code>.
      </div>

      <p className="compare-label">First visit — no vehicles yet</p>
      <div className="compare-row">
        <div>
          <h2 className="compare-title">Option A — Zero in product</h2>
          <div className="device-frame">
            <div className="device-chrome">
              <span className="device-dot" />
              <span className="device-dot" />
              <span className="device-dot" />
              <span className="device-url">app.vehicleos.app</span>
            </div>
            <div className="device-screen screen-zero">
              <div className="mini-header">
                <div className="mini-logo">
                  <span className="mini-logo-mark">
                    <OrbitIcon size={11} />
                  </span>
                  VehicleOS
                </div>
                <span className="mini-nav">Watch demo</span>
              </div>
              <div className="empty-calm">
                <h2>No vehicles yet</h2>
                <p>
                  Add your car to start a timeline — receipts, mileage, and what&apos;s
                  due next.
                </p>
                <button type="button" className="btn-primary">
                  Add vehicle
                </button>
                <button type="button" className="btn-secondary">
                  Import history
                </button>
              </div>
            </div>
          </div>
          <p className="verdict-box">
            <strong>Feel:</strong> Dub / Linear calm. No gradient, left-aligned,
            utilitarian. User goes straight to work.
          </p>
        </div>

        <div>
          <h2 className="compare-title">Option B — Branded empty state only</h2>
          <div className="device-frame">
            <div className="device-chrome">
              <span className="device-dot" />
              <span className="device-dot" />
              <span className="device-dot" />
              <span className="device-url">app.vehicleos.app</span>
            </div>
            <div className="device-screen screen-branded">
              <div className="mini-header">
                <div className="mini-logo">
                  <span className="mini-logo-mark">
                    <OrbitIcon size={11} />
                  </span>
                  VehicleOS
                </div>
                <span className="mini-nav">Watch demo</span>
              </div>
              <div className="branded-center">
                <div className="branded-mark">
                  <OrbitIcon size={22} />
                </div>
                <p className="branded-eyebrow">Your car, remembered</p>
                <h2>Start your ownership timeline</h2>
                <p>
                  One place for receipts, reminders, and plain-English answers —
                  you confirm before anything changes.
                </p>
                <button type="button" className="btn-primary">
                  Add your first vehicle
                </button>
                <div className="branded-steps">
                  <span>
                    <span className="step-num">01</span> Add car
                  </span>
                  <span>
                    <span className="step-num">02</span> Upload receipt
                  </span>
                  <span>
                    <span className="step-num">03</span> See what&apos;s due
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="verdict-box">
            <strong>Feel:</strong> Reflect-inspired — one warm gradient, centered
            hero, larger mark. Shown <strong>once</strong>; never again after first
            vehicle.
          </p>
        </div>
      </div>

      <section className="after-section">
        <h3>After first vehicle — both options look identical</h3>
        <p>
          Branded moment does not persist. Dashboard, timeline, and recommendations
          use the same calm UI either way.
        </p>
        <div className="device-frame">
          <div className="device-chrome">
            <span className="device-dot" />
            <span className="device-dot" />
            <span className="device-dot" />
            <span className="device-url">app.vehicleos.app · 2019 Honda Civic</span>
          </div>
          <div className="device-screen screen-after">
            <div className="dash-header">
              <h4>Timeline</h4>
              <span>12,400 mi · Last service Jan 2026</span>
            </div>
            <div className="timeline-card">
              <span className="mono">Service recorded</span>
              <strong>Oil change · Jiffy Lube</strong>
              <p>Extracted from receipt · You confirmed</p>
            </div>
            <div className="rec-card">
              <strong>Due in ~2,600 mi:</strong> Cabin air filter — based on your
              schedule, not a sales pitch.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
