"use client";

import { useEffect, useState } from "react";
import {
  queue,
  quote,
  receipt,
  recommendation,
  screenForQueue,
  STORAGE_KEY,
  timeline,
  upcoming,
  vehicle,
  type AppScreen,
} from "../lib/data";
import {
  IconCamera,
  IconMic,
  OrbitIcon,
  ProgressBar,
  QueueIcon,
} from "../lib/icons";

type Phase = "loading" | "empty" | "add-vehicle" | "app";

export function ProductApp() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [screen, setScreen] = useState<AppScreen>("overview");
  const [activeQueue, setActiveQueue] = useState("action-receipt");
  const [showVerdict, setShowVerdict] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem(STORAGE_KEY) === "1";
    setPhase(onboarded ? "app" : "empty");
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setPhase("app");
    setScreen("overview");
  };

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPhase("empty");
    setScreen("overview");
    setShowVerdict(false);
  };

  const selectQueue = (id: string) => {
    setActiveQueue(id);
    setScreen(screenForQueue(id));
  };

  const banner = (
    <div className="pg-banner">
      <span>
        <strong>Design playground</strong> · premium craft preview · port 3002
      </span>
      <button type="button" onClick={resetDemo}>
        Reset demo
      </button>
    </div>
  );

  if (phase === "loading") {
    return (
      <>
        {banner}
        <div className="onboard" style={{ alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--product-muted)" }}>Loading…</p>
        </div>
      </>
    );
  }

  if (phase === "empty") {
    return (
      <>
        {banner}
        <div className="onboard">
          <header className="onboard-header">
            <div className="onboard-logo">
              <span className="onboard-mark">
                <OrbitIcon size={16} />
              </span>
              VehicleOS
            </div>
          </header>
          <div className="onboard-empty">
            <div className="onboard-hero-mark">
              <OrbitIcon size={32} />
            </div>
            <p className="onboard-eyebrow">Your car, remembered</p>
            <h1>Start your ownership timeline</h1>
            <p>We nudge you when something&apos;s due. Confirm with a tap, photo, or voice.</p>
            <button type="button" className="btn-primary" onClick={() => setPhase("add-vehicle")}>
              Add your first vehicle
            </button>
            <div className="onboard-steps">
              <div className="onboard-step">
                <span className="onboard-step-bubble">1</span>
                Add
              </div>
              <div className="onboard-step">
                <span className="onboard-step-bubble">
                  <IconCamera />
                </span>
                Snap
              </div>
              <div className="onboard-step">
                <span className="onboard-step-bubble">OK</span>
                Done
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (phase === "add-vehicle") {
    return (
      <>
        {banner}
        <div className="onboard">
          <header className="onboard-header">
            <div className="onboard-logo">
              <span className="onboard-mark">
                <OrbitIcon size={16} />
              </span>
              VehicleOS
            </div>
            <button type="button" className="btn-ghost" onClick={() => setPhase("empty")}>
              Back
            </button>
          </header>
          <div className="onboard-form-wrap">
            <div className="onboard-form">
            <h1>Add your vehicle</h1>
            <p>Under 30 seconds — then we handle the reminders.</p>
            <div className="field">
              <label htmlFor="year">Year</label>
              <input id="year" defaultValue="2019" readOnly />
            </div>
            <div className="field">
              <label htmlFor="model">Make & model</label>
              <input id="model" defaultValue="Honda Civic" readOnly />
            </div>
            <div className="field">
              <label htmlFor="miles">Current mileage</label>
              <input id="miles" defaultValue="42,100" readOnly />
            </div>
            <button type="button" className="btn-primary full" onClick={completeOnboarding}>
              Save & continue
            </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const renderMain = () => {
    if (screen === "overview") {
      return (
        <>
          <h2>Now</h2>
          <p className="lead">Pick an item from the queue — or capture a receipt.</p>
          <div className="stat-row">
            <div className="stat-card due">
              <span className="num">1</span>
              <span className="lbl">Due</span>
            </div>
            <div className="stat-card action">
              <span className="num">1</span>
              <span className="lbl">Action</span>
            </div>
            <div className="stat-card rec">
              <span className="num">1</span>
              <span className="lbl">Rec</span>
            </div>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--product-muted)" }}>
            Web is your <strong style={{ color: "var(--product-ink)" }}>review desk</strong> — mobile
            pushes notifications; this is where you confirm receipts and check quotes.
          </p>
          <div className="mobile-hint">
            On phone: same queue as glanceable cards + push alerts. This layout is desktop-only.
          </div>
        </>
      );
    }

    if (screen === "review") {
      return (
        <>
          <h2>Review receipt</h2>
          <p className="lead">Image and extraction side by side — confirm before it hits your timeline.</p>
          <div className="split">
            <div className="receipt-visual">
              <span>Receipt image</span>
              <span className="drop-zone">Drop file or paste</span>
            </div>
            <div className="extract-stack">
              <div className="extract-field">
                <label>Shop</label>
                <div className="val">{receipt.shop}</div>
              </div>
              <div className="extract-field">
                <label>Date · Mileage</label>
                <div className="val">
                  {receipt.date} · {receipt.miles.toLocaleString()} mi
                </div>
              </div>
              <div className="extract-field highlight">
                <label>Line items</label>
                <div className="val">{receipt.lines.join(" · ")}</div>
              </div>
              <div className="extract-field">
                <label>Total</label>
                <div className="val">{receipt.total}</div>
              </div>
              <div className="action-row">
                <button type="button" className="btn-primary" onClick={() => setScreen("overview")}>
                  Confirm & save
                </button>
                <button type="button" className="btn-secondary">
                  Edit fields
                </button>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (screen === "quote") {
      return (
        <>
          <h2>Quote check</h2>
          <p className="lead">Paste a dealer quote — rules compare to your vehicle history.</p>
          <textarea className="quote-area" readOnly defaultValue={quote.body} rows={5} />
          <button type="button" className="btn-primary" onClick={() => setShowVerdict(true)}>
            Check fairness
          </button>
          {showVerdict && (
            <div className="verdict">
              <h3>{quote.verdict}</h3>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                Typical range for your Civic at {vehicle.mileage.toLocaleString()} mi:
              </p>
              <div className="range">{quote.range}</div>
            </div>
          )}
        </>
      );
    }

    if (screen === "timeline") {
      return (
        <>
          <h2>Service history</h2>
          <p className="lead">Full timeline when you need records — not the default home.</p>
          <div className="timeline-rail">
            {timeline.map((event) => (
              <div key={event.id} className="tl-item">
                <strong>{event.title}</strong>
                <span>
                  {event.date} · {event.miles.toLocaleString()} mi · {event.shop}
                </span>
              </div>
            ))}
          </div>
        </>
      );
    }

    if (screen === "due") {
      return (
        <>
          <h2>Tire rotation</h2>
          <p className="lead">~1 week · last at 37,200 mi · interval 5,000 mi</p>
          <ProgressBar value={88} tone="amber" wide />
          <div className="extract-field" style={{ marginTop: 16 }}>
            <label>Current mileage</label>
            <div className="val">{vehicle.mileage.toLocaleString()} mi</div>
          </div>
          <div className="policy-line">schedule.policy.tire_rotation · v1</div>
          <div className="action-row">
            <button type="button" className="btn-primary" onClick={() => setScreen("overview")}>
              Mark scheduled
            </button>
            <button type="button" className="btn-secondary">
              Snooze 2 weeks
            </button>
            <button type="button" className="btn-secondary">
              Already done
            </button>
          </div>
        </>
      );
    }

    if (screen === "recommendation") {
      return (
        <>
          <h2>{recommendation.title}</h2>
          <p className="lead">
            ~{recommendation.miles.toLocaleString()} mi · ~{recommendation.months} months
          </p>
          <ProgressBar value={62} tone="green" wide />
          <div className="extract-field" style={{ marginTop: 16 }}>
            <label>Why</label>
            <div className="val" style={{ fontWeight: 400 }}>
              {recommendation.why}
            </div>
          </div>
          <div className="policy-line">{recommendation.rule}</div>
          <div className="action-row">
            <button type="button" className="btn-primary" onClick={() => setScreen("overview")}>
              Approve reminder
            </button>
            <button type="button" className="btn-secondary">
              Snooze 30 days
            </button>
            <button type="button" className="btn-secondary">
              Mark done
            </button>
          </div>
        </>
      );
    }

    if (screen === "capture") {
      return (
        <>
          <h2>Capture</h2>
          <p className="lead">Photo, voice, or paste — we extract, you confirm.</p>
          <div className="capture-zone">
            <IconCamera />
            <p>Drop receipt image or click to browse</p>
          </div>
          <div className="action-row">
            <button type="button" className="btn-primary" onClick={() => selectQueue("action-receipt")}>
              Use sample receipt
            </button>
            <button type="button" className="btn-secondary">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconMic /> Voice note
              </span>
            </button>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <>
      {banner}
      <div className="app-shell">
        <header className="app-top">
          <button type="button" className="logo" onClick={() => setScreen("overview")}>
            <span className="mark">
              <OrbitIcon size={14} />
            </span>
            VehicleOS
          </button>
          <div className="app-vehicle">
            <strong>{vehicle.label}</strong> · {vehicle.mileage.toLocaleString()} mi
          </div>
          <div className="app-top-actions">
            <button type="button" className="capture-pill" onClick={() => setScreen("capture")}>
              <IconCamera /> Add
            </button>
            <button type="button" className="btn-primary" onClick={() => setScreen("capture")}>
              + Record
            </button>
          </div>
        </header>

        <div className="app-body">
          <aside className="app-sidebar">
            <p className="sidebar-label">Needs you</p>
            {queue.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`queue-btn ${item.kind}${activeQueue === item.id ? " active" : ""}`}
                onClick={() => selectQueue(item.id)}
              >
                <span className={`queue-icon`}>
                  <QueueIcon kind={item.kind} />
                </span>
                <span className="queue-text">
                  <strong>{item.label}</strong>
                  <span className="queue-meta">
                    <span className="queue-badge">{item.badge}</span>
                    {item.progress !== undefined && (
                      <ProgressBar
                        value={item.progress}
                        tone={item.kind === "due" ? "amber" : "green"}
                      />
                    )}
                  </span>
                </span>
              </button>
            ))}
            <div className="sidebar-capture">
              <button type="button" className="btn-secondary full" style={{ width: "100%" }} onClick={() => setScreen("capture")}>
                Photo receipt
              </button>
              <button type="button" className="btn-secondary full" style={{ width: "100%" }} onClick={() => setScreen("quote")}>
                Paste quote
              </button>
              <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={() => setScreen("timeline")}>
                Full history →
              </button>
            </div>
          </aside>

          <main className="app-main">
            <div className="main-panel">{renderMain()}</div>
          </main>

          <aside className="app-rail">
            <p className="rail-title">Upcoming</p>
            {upcoming.map((item) => (
              <div key={item.label} className="rail-item">
                <span className={`dot ${item.tone}`} />
                {item.label}
                <span className="when">{item.when}</span>
              </div>
            ))}
            <div className="rail-section">
              <p className="rail-title">Recent</p>
              {timeline.slice(0, 2).map((event) => (
                <div key={event.id} className="rail-item">
                  <span className="dot ok" />
                  {event.title}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
