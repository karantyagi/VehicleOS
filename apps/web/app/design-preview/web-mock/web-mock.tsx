"use client";

import { useState } from "react";
import Link from "next/link";
import { FeedKindIcon, OrbitIcon } from "../lib/mock-icons";
import {
  feedItems,
  mockVehicle,
  quoteDraft,
  receiptDraft,
  timelineEvents,
  upcomingItems,
  type WebPanel,
} from "../product-mock/mock-data";
import "./web-mock.css";

export function WebMock() {
  const [panel, setPanel] = useState<WebPanel>("review");
  const [activeQueue, setActiveQueue] = useState("action-receipt");

  return (
    <div className="web-mock-page">
      <div className="page-header">
        <h1>Web app mock — review desk</h1>
        <p>
          Desktop companion: split-pane review, quote check, timeline. Not a stretched phone UI.{" "}
          <Link href="/design-preview/product-mock">← Mobile mock</Link>
          {" · "}
          <Link href="/design-preview">All previews</Link>
        </p>
      </div>

      <div className="panel-picker">
        {(
          [
            ["review", "Review receipt"],
            ["quote", "Quote check"],
            ["timeline", "Full history"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={panel === id ? "active" : ""}
            onClick={() => setPanel(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="web-desktop-frame">
        <header className="web-top-bar">
          <div className="logo">
            <span className="web-logo-mark">
              <OrbitIcon size={14} />
            </span>
            VehicleOS
          </div>
          <div className="web-vehicle-select">
            <strong>{mockVehicle.label}</strong>
            <span>{mockVehicle.mileage.toLocaleString()} mi</span>
          </div>
          <div className="web-top-actions">
            <button type="button">+ Add record</button>
          </div>
        </header>

        <div className="web-layout">
          <aside className="web-sidebar">
            <h3>Needs you</h3>
            {feedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`web-queue-item${activeQueue === item.id ? " active" : ""}`}
                onClick={() => {
                  setActiveQueue(item.id);
                  if (item.kind === "action") setPanel("review");
                  if (item.id === "rec-filter") setPanel("quote");
                  if (item.kind === "due") setPanel("review");
                }}
              >
                <FeedKindIcon kind={item.kind} />
                {item.shortLabel}
                <span className="badge">{item.badge}</span>
              </button>
            ))}
          </aside>

          <main className="web-main">
            {panel === "review" && (
              <>
                <h2>Review receipt</h2>
                <p className="sub">Drag a photo or confirm what we extracted — side by side.</p>
                <div className="web-split">
                  <div className="web-receipt-img">
                    <span>Receipt image</span>
                    <span className="drop-hint">Drop file or paste</span>
                  </div>
                  <div className="web-extract-panel">
                    <div className="web-extract-row">
                      <label>Shop</label>
                      <div className="val">{receiptDraft.shop}</div>
                    </div>
                    <div className="web-extract-row">
                      <label>Date · Mileage</label>
                      <div className="val">
                        {receiptDraft.date} · {receiptDraft.miles.toLocaleString()} mi
                      </div>
                    </div>
                    <div className="web-extract-row highlight">
                      <label>Line items</label>
                      <div className="val">{receiptDraft.lines.join(" · ")}</div>
                    </div>
                    <div className="web-extract-row">
                      <label>Total</label>
                      <div className="val">{receiptDraft.total}</div>
                    </div>
                    <div className="web-btn-row">
                      <button type="button" className="primary">
                        Confirm & save
                      </button>
                      <button type="button" className="secondary">
                        Edit fields
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {panel === "quote" && (
              <>
                <h2>Quote check</h2>
                <p className="sub">Paste a dealer quote — rules compare to your vehicle history.</p>
                <textarea
                  className="web-quote-input"
                  readOnly
                  defaultValue={`${quoteDraft.dealer}\n${quoteDraft.items.join("\n")}\nQuoted: ${quoteDraft.quoted}`}
                />
                <div className="web-btn-row">
                  <button type="button" className="primary">
                    Check fairness
                  </button>
                </div>
                <div className="web-verdict">
                  <h4>{quoteDraft.verdict}</h4>
                  <p>Typical range for your Civic at {mockVehicle.mileage.toLocaleString()} mi:</p>
                  <div className="range">{quoteDraft.fairRange}</div>
                </div>
              </>
            )}

            {panel === "timeline" && (
              <>
                <h2>Service history</h2>
                <p className="sub">Full timeline when you need records — not the mobile home screen.</p>
                <div className="web-timeline-line">
                  {timelineEvents.map((event) => (
                    <div key={event.id} className="web-timeline-node">
                      <strong>{event.title}</strong>
                      <span>
                        {event.date} · {event.miles.toLocaleString()} mi · {event.shop}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </main>

          <aside className="web-rail">
            <h3>Upcoming</h3>
            {upcomingItems.map((item) => (
              <div key={item.label} className="web-upcoming-item">
                <span className={`web-status-dot ${item.status}`} />
                <span>{item.label}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#49624c" }}>
                  {item.when}
                </span>
              </div>
            ))}
            <div className="web-timeline-compact">
              <h3>Recent</h3>
              {timelineEvents.slice(0, 2).map((event) => (
                <div key={event.id} className="web-upcoming-item">
                  <span className="web-status-dot ok" />
                  <span>{event.title}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <div className="web-mock-note">
        <strong>Mobile vs web:</strong> Phone pushes &quot;due next week&quot; → you tap → quick action.
        Web is where you <strong>review receipts</strong>, <strong>paste dealer quotes</strong>, and{" "}
        <strong>browse history</strong> on a big screen. Same data, different jobs.
      </div>
    </div>
  );
}
