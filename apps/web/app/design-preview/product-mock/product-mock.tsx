"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FeedKindIcon,
  IconCamera,
  IconMic,
  IconQuote,
  MiniProgress,
  OrbitIcon,
} from "../lib/mock-icons";
import {
  feedItems,
  mockVehicle,
  receiptDraft,
  recommendationDetail,
  timelineEvents,
  type MockScreen,
} from "./mock-data";
import "./mock.css";

const screenLabels: Record<MockScreen, string> = {
  empty: "Empty",
  "add-vehicle": "Add car",
  now: "Now",
  "due-detail": "Due",
  "action-receipt": "Receipt",
  recommendation: "Rec",
  timeline: "History",
  upload: "Capture",
};

export function ProductMock() {
  const [screen, setScreen] = useState<MockScreen>("empty");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [showPush, setShowPush] = useState(false);

  const goNow = () => {
    setHasVehicle(true);
    setScreen("now");
    setShowPush(true);
  };

  const openFeedItem = (id: string) => {
    if (id === "due-tire") setScreen("due-detail");
    if (id === "action-receipt") setScreen("action-receipt");
    if (id === "rec-filter") setScreen("recommendation");
  };

  const renderHeader = (minimal = false) => (
    <header className={`mock-app-header${minimal ? " minimal" : ""}`}>
      <button type="button" className="mock-logo" onClick={() => setScreen(hasVehicle ? "now" : "empty")}>
        <span className="mock-logo-mark">
          <OrbitIcon size={12} />
        </span>
        VehicleOS
      </button>
    </header>
  );

  const renderBottomNav = () =>
    hasVehicle ? (
      <nav className="mock-bottom-nav" aria-label="Main">
        <button type="button" className={screen === "now" ? "active" : ""} onClick={() => setScreen("now")}>
          <span className="nav-dot" />
          Now
        </button>
        <button type="button" className={screen === "upload" ? "active" : ""} onClick={() => setScreen("upload")}>
          <span className="nav-dot" />
          Capture
        </button>
        <button
          type="button"
          className={screen === "timeline" ? "active" : ""}
          onClick={() => setScreen("timeline")}
        >
          <span className="nav-dot" />
          History
        </button>
      </nav>
    ) : null;

  const renderScreen = () => {
    if (screen === "empty") {
      return (
        <div className="mock-empty-branded">
          {renderHeader(true)}
          <div className="mock-empty-center">
            <div className="mock-empty-mark">
              <OrbitIcon size={28} />
            </div>
            <h2>Your car, remembered</h2>
            <p>Nudges when due. Confirm with a tap, photo, or voice.</p>
            <button type="button" className="mock-btn-primary" onClick={() => setScreen("add-vehicle")}>
              Add vehicle
            </button>
            <div className="mock-visual-steps">
              <div className="mock-visual-step">
                <span className="bubble">1</span>
                Add
              </div>
              <div className="mock-visual-step">
                <span className="bubble">
                  <IconCamera />
                </span>
                Snap
              </div>
              <div className="mock-visual-step">
                <span className="bubble">OK</span>
                Done
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (screen === "add-vehicle") {
      return (
        <>
          {renderHeader()}
          <div className="mock-form-body">
            <h2>Add vehicle</h2>
            <p>Quick setup — under 30 seconds.</p>
            <div className="mock-field">
              <label htmlFor="year">Year</label>
              <input id="year" defaultValue="2019" readOnly />
            </div>
            <div className="mock-field">
              <label htmlFor="make">Make / Model</label>
              <input id="make" defaultValue="Honda Civic" readOnly />
            </div>
            <div className="mock-field">
              <label htmlFor="miles">Mileage</label>
              <input id="miles" defaultValue="42,100" readOnly />
            </div>
            <button type="button" className="mock-btn-primary" onClick={goNow}>
              Continue
            </button>
          </div>
        </>
      );
    }

    if (screen === "now") {
      return (
        <>
          {renderHeader()}
          {showPush && (
            <div className="mock-push-ios">
              <div className="push-icon">
                <OrbitIcon size={14} />
              </div>
              <div>
                <strong>VehicleOS</strong>
                <p>Tire rotation · likely next week</p>
              </div>
              <button
                type="button"
                className="mock-back"
                style={{ marginLeft: "auto", marginBottom: 0 }}
                onClick={() => setShowPush(false)}
              >
                ×
              </button>
            </div>
          )}
          <div className="mock-vehicle-pill">
            {mockVehicle.label}
            <span>{mockVehicle.mileage.toLocaleString()} mi</span>
          </div>
          <div className="mock-stat-row">
            <div className="mock-stat-chip due">
              <span className="num">1</span>
              <span className="lbl">Due</span>
            </div>
            <div className="mock-stat-chip action">
              <span className="num">1</span>
              <span className="lbl">Action</span>
            </div>
            <div className="mock-stat-chip rec">
              <span className="num">1</span>
              <span className="lbl">Rec</span>
            </div>
          </div>
          <div className="mock-feed">
            {feedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mock-feed-card ${item.kind}`}
                onClick={() => openFeedItem(item.id)}
              >
                <span className="mock-feed-icon">
                  <FeedKindIcon kind={item.kind} />
                </span>
                <span className="mock-feed-body">
                  <h3>{item.shortLabel}</h3>
                  <div className="mock-feed-meta">
                    <span className="mock-badge">{item.badge}</span>
                    {item.progress !== undefined && (
                      <MiniProgress value={item.progress} tone={item.kind === "due" ? "amber" : "green"} />
                    )}
                  </div>
                </span>
                <span className="mock-chevron">›</span>
              </button>
            ))}
          </div>
          <div className="mock-quick-actions">
            <button type="button" className="mock-quick-btn" onClick={() => setScreen("upload")}>
              <IconCamera />
              Photo
            </button>
            <button type="button" className="mock-quick-btn">
              <IconMic />
              Voice
            </button>
            <button type="button" className="mock-quick-btn">
              <IconQuote />
              Quote
            </button>
          </div>
          {renderBottomNav()}
        </>
      );
    }

    if (screen === "due-detail") {
      return (
        <>
          {renderHeader()}
          <div className="mock-detail-body">
            <button type="button" className="mock-back" onClick={() => setScreen("now")}>
              ← Now
            </button>
            <h2>Tire rotation</h2>
            <p>~1 week · last at 37,200 mi</p>
            <MiniProgress value={88} tone="amber" />
            <div className="mock-detail-box" style={{ marginTop: 12 }}>
              Interval 5,000 mi · now {mockVehicle.mileage.toLocaleString()} mi
            </div>
            <div className="mock-action-row">
              <button type="button" className="primary" onClick={() => setScreen("now")}>
                Scheduled
              </button>
              <button type="button" className="secondary">
                Snooze
              </button>
              <button type="button" className="secondary">
                Done
              </button>
            </div>
          </div>
          {renderBottomNav()}
        </>
      );
    }

    if (screen === "action-receipt") {
      return (
        <>
          {renderHeader()}
          <div className="mock-detail-body">
            <button type="button" className="mock-back" onClick={() => setScreen("now")}>
              ← Now
            </button>
            <h2>Confirm receipt</h2>
            <p>Check extraction before saving.</p>
            <div className="mock-detail-visual">Receipt photo</div>
            <div className="mock-detail-box">
              <strong>{receiptDraft.shop}</strong> · {receiptDraft.total}
              <br />
              {receiptDraft.miles.toLocaleString()} mi
            </div>
            <div className="mock-action-row">
              <button type="button" className="primary" onClick={() => setScreen("now")}>
                Confirm
              </button>
              <button type="button" className="secondary">
                Edit
              </button>
            </div>
          </div>
          {renderBottomNav()}
        </>
      );
    }

    if (screen === "recommendation") {
      return (
        <>
          {renderHeader()}
          <div className="mock-detail-body">
            <button type="button" className="mock-back" onClick={() => setScreen("now")}>
              ← Now
            </button>
            <h2>Cabin filter</h2>
            <p>{recommendationDetail.dueInMiles.toLocaleString()} mi · ~{recommendationDetail.dueInMonths} mo</p>
            <MiniProgress value={62} tone="green" />
            <div className="mock-detail-box" style={{ marginTop: 12 }}>
              {recommendationDetail.why}
            </div>
            <div className="mock-action-row">
              <button type="button" className="primary" onClick={() => setScreen("now")}>
                Approve
              </button>
              <button type="button" className="secondary">
                Snooze
              </button>
            </div>
          </div>
          {renderBottomNav()}
        </>
      );
    }

    if (screen === "timeline") {
      return (
        <>
          {renderHeader()}
          <div className="mock-detail-body">
            <h2>History</h2>
            <p>When you need proof.</p>
            {timelineEvents.map((event) => (
              <div key={event.id} className="mock-timeline-item">
                <span className="mock-timeline-dot" />
                <div>
                  <strong>{event.title}</strong>
                  <span>
                    {event.date} · {event.miles.toLocaleString()} mi · {event.shop}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {renderBottomNav()}
        </>
      );
    }

    if (screen === "upload") {
      return (
        <>
          {renderHeader()}
          <div className="mock-detail-body">
            <h2>Capture</h2>
            <p>Photo, voice, or paste a quote.</p>
            <div className="mock-upload-zone">
              <div className="big-icon">
                <IconCamera />
              </div>
              Tap to add receipt
            </div>
            <button type="button" className="mock-btn-primary" onClick={() => setScreen("action-receipt")}>
              Try sample
            </button>
          </div>
          {renderBottomNav()}
        </>
      );
    }

    return null;
  };

  return (
    <div className="product-mock-page">
      <div className="page-header">
        <h1>Mobile app mock</h1>
        <p>
          Glanceable · notification-first · tap / photo / voice.{" "}
          <Link href="/design-preview/web-mock">See web app mock →</Link>
          {" · "}
          <Link href="/design-preview">All previews</Link>
        </p>
      </div>

      <div className="role-compare">
        <div className="role-card">
          <strong>Mobile = on-the-go</strong>
          Push alerts, 3-stat glance, icon cards, quick capture bar. Minimal reading.
        </div>
        <div className="role-card">
          <strong>Web = review desk</strong>
          Split-pane receipt review, quote check, full timeline.{" "}
          <Link href="/design-preview/web-mock">Open web mock</Link>
        </div>
      </div>

      <div className="screen-picker">
        {(Object.keys(screenLabels) as MockScreen[]).map((key) => (
          <button
            key={key}
            type="button"
            className={screen === key ? "active" : ""}
            onClick={() => {
              if (key !== "empty" && key !== "add-vehicle") setHasVehicle(true);
              if (key === "empty") setHasVehicle(false);
              setScreen(key);
            }}
          >
            {screenLabels[key]}
          </button>
        ))}
      </div>

      <div className="product-mock-phone">
        <div className="phone-status">
          <span>9:41</span>
          <span>5G</span>
        </div>
        <div className="phone-screen">{renderScreen()}</div>
      </div>
    </div>
  );
}
