"use client";

import { useMemo, useState } from "react";
import { getApiBase } from "../lib/api-base";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number;
};

type TimelineEntry = {
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
};

type QueueItem = {
  taskId: string;
  title: string;
  reason: string;
  status: string;
};

const receiptForm = {
  shop: "Jiffy Lube",
  serviceDate: "2026-01-12",
  mileage: 41_800,
  lineItems: "Oil change (synthetic)\nFilter replaced",
  total: "$67.42",
};

export function OwnerDashboard() {
  const apiBase = getApiBase();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [nowQueue, setNowQueue] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);
  const [form, setForm] = useState(receiptForm);

  const vehicleLabel = useMemo(() => {
    if (!vehicle) return null;
    return `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.currentMileage.toLocaleString()} mi`;
  }, [vehicle]);

  const createVehicle = async () => {
    setIsBusy(true);
    setStatus("Creating vehicle…");
    try {
      const response = await fetch(`${apiBase}/api/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: "DEMO-VIN-001",
          year: 2019,
          make: "Honda",
          model: "Civic",
          currentMileage: form.mileage,
        }),
      });
      if (!response.ok) throw new Error("create failed");
      const body = (await response.json()) as { vehicle: Vehicle };
      setVehicle(body.vehicle);
      setStatus("Vehicle ready. Upload a receipt to run the golden path.");
    } catch {
      setStatus(
        apiBase
          ? "Could not reach API. Check NEXT_PUBLIC_API_URL or start apps/api on port 4000."
          : "Could not reach API. Set DATABASE_URL on Vercel or run locally with pnpm dev.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const submitReceipt = async () => {
    if (!vehicle) return;
    setIsBusy(true);
    setStatus("Recording service and generating recommendation…");
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicle.id}/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: form.shop,
          serviceDate: form.serviceDate,
          mileage: Number(form.mileage),
          lineItems: form.lineItems.split("\n").map((line) => line.trim()).filter(Boolean),
          total: form.total,
        }),
      });
      if (!response.ok) throw new Error("receipt failed");
      const body = (await response.json()) as {
        timeline: TimelineEntry[];
        nowQueue: QueueItem[];
      };
      setTimeline(body.timeline);
      setNowQueue(body.nowQueue);
      setStatus("Golden path complete — review the Now queue.");
    } catch {
      setStatus("Receipt submission failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const decide = async (taskId: string, decision: "approve" | "dismiss" | "snooze") => {
    if (!vehicle) return;
    setIsBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/tasks/${taskId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id, decision }),
      });
      if (!response.ok) throw new Error("decide failed");
      const body = (await response.json()) as { nowQueue: QueueItem[] };
      setNowQueue(body.nowQueue);
      setStatus(`Task ${decision}d.`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Owners · Early access</p>
        <h1>Receipt → recommendation → approve</h1>
        <p>{status || "Add your vehicle, confirm a receipt, then approve the recommended task."}</p>
      </section>

      <section className="golden-grid">
        <article className="panel">
          <h2>1 · Your vehicle</h2>
          {vehicle ? (
            <p>{vehicleLabel}</p>
          ) : (
            <button type="button" disabled={isBusy} onClick={createVehicle}>
              Add your vehicle
            </button>
          )}
        </article>

        <article className="panel">
          <h2>2 · Receipt</h2>
          <label>
            Shop
            <input
              value={form.shop}
              onChange={(event) => setForm({ ...form, shop: event.target.value })}
            />
          </label>
          <label>
            Service date
            <input
              value={form.serviceDate}
              onChange={(event) => setForm({ ...form, serviceDate: event.target.value })}
            />
          </label>
          <label>
            Mileage
            <input
              type="number"
              value={form.mileage}
              onChange={(event) => setForm({ ...form, mileage: Number(event.target.value) })}
            />
          </label>
          <label>
            Line items
            <textarea
              value={form.lineItems}
              onChange={(event) => setForm({ ...form, lineItems: event.target.value })}
              rows={3}
            />
          </label>
          <label>
            Total
            <input
              value={form.total}
              onChange={(event) => setForm({ ...form, total: event.target.value })}
            />
          </label>
          <button type="button" disabled={isBusy || !vehicle} onClick={submitReceipt}>
            Confirm receipt → run loop
          </button>
        </article>

        <article className="panel">
          <h2>3 · Timeline</h2>
          {timeline.length === 0 ? (
            <p className="muted">No services recorded yet.</p>
          ) : (
            <ul className="timeline-list">
              {timeline.map((entry) => (
                <li key={`${entry.serviceDate}-${entry.mileage}`}>
                  <strong>{entry.serviceDate}</strong> · {entry.mileage.toLocaleString()} mi · {entry.shop}
                  <span>{entry.lineItems.join(", ")}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h2>4 · Now queue</h2>
          {nowQueue.length === 0 ? (
            <p className="muted">No tasks yet.</p>
          ) : (
            <ul className="queue-list">
              {nowQueue.map((item) => (
                <li key={item.taskId}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.reason}</p>
                    <span className="badge">{item.status}</span>
                  </div>
                  {item.status === "pending" ? (
                    <div className="actions">
                      <button type="button" disabled={isBusy} onClick={() => decide(item.taskId, "approve")}>
                        Approve
                      </button>
                      <button type="button" disabled={isBusy} onClick={() => decide(item.taskId, "dismiss")}>
                        Dismiss
                      </button>
                      <button type="button" disabled={isBusy} onClick={() => decide(item.taskId, "snooze")}>
                        Snooze
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}
