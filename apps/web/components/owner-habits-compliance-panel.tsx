"use client";

import { useEffect, useState } from "react";
import type { OwnershipRecordEntry } from "@/lib/console-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";

type OwnerHabitsCompliancePanelProps = {
  vehicleId: string;
  apiBase: string;
  records: OwnershipRecordEntry[];
  disabled?: boolean;
  onHabitProposed: (taskId: string) => void;
  onComplianceSaved: () => void;
  onError: (message: string) => void;
};

export function OwnerHabitsCompliancePanel({
  vehicleId,
  apiBase,
  records,
  disabled = false,
  onHabitProposed,
  onComplianceSaved,
  onError,
}: OwnerHabitsCompliancePanelProps) {
  const speech = useSpeechRecognition();
  const [habitText, setHabitText] = useState("");
  const [captureChannel, setCaptureChannel] = useState<"voice" | "text">("text");
  const [isSavingHabit, setIsSavingHabit] = useState(false);
  const existingLicense = records.find((record) => record.eventType === "license");
  const existingExpirationDate = existingLicense?.details
    .find((detail) => detail.toLowerCase().startsWith("expiration date:"))
    ?.slice("expiration date:".length)
    .trim();
  const [jurisdiction, setJurisdiction] = useState("MA");
  const [issuer, setIssuer] = useState(existingLicense?.agency ?? "Massachusetts RMV (myRMV)");
  const [expirationDate, setExpirationDate] = useState(existingExpirationDate ?? "");
  const [isSavingLicense, setIsSavingLicense] = useState(false);

  useEffect(() => {
    const transcript = [speech.transcript, speech.interimTranscript].filter(Boolean).join(" ").trim();
    if (transcript) setHabitText(transcript);
  }, [speech.interimTranscript, speech.transcript]);

  useEffect(() => {
    if (!existingLicense) return;
    setIssuer(existingLicense.agency);
    setExpirationDate(existingExpirationDate ?? "");
  }, [existingExpirationDate, existingLicense?.agency, existingLicense?.recordId]);

  const proposeHabit = async () => {
    if (!habitText.trim()) {
      onError("Describe the habit and its interval first.");
      return;
    }
    setIsSavingHabit(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/owner-habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: habitText.trim(), captureChannel }),
      });
      const body = (await response.json()) as { error?: string; taskId?: string };
      if (!response.ok || !body.taskId) {
        onError(body.error ?? "Could not understand this owner habit.");
        return;
      }
      setHabitText("");
      speech.resetTranscript();
      onHabitProposed(body.taskId);
    } catch {
      onError("Could not save the owner habit proposal.");
    } finally {
      setIsSavingHabit(false);
    }
  };

  const saveLicense = async () => {
    if (!expirationDate) {
      onError("Add the driver's-license expiration date.");
      return;
    }
    setIsSavingLicense(true);
    try {
      const response = await fetch(`${apiBase}/api/owner/driver-license`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: existingLicense?.recordId,
          jurisdiction,
          agency: issuer,
          expirationDate,
          description: `${jurisdiction} driver's license renewal`,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        onError(body.error ?? "Could not save the driver's-license deadline.");
        return;
      }
      onComplianceSaved();
    } catch {
      onError("Could not save the driver's-license deadline.");
    } finally {
      setIsSavingLicense(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer font-medium text-foreground">Add an owner habit</summary>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Say or type the habit naturally. The assistant extracts a structured interval, then asks you to confirm it.
          </p>
          <Textarea
            rows={3}
            value={habitText}
            disabled={disabled || isSavingHabit}
            placeholder='Example: "I add Chevron Techron every 3,000 miles."'
            onChange={(event) => {
              setHabitText(event.target.value);
              setCaptureChannel("text");
            }}
          />
          <div className="flex flex-wrap gap-2">
            {speech.isSupported ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || isSavingHabit || speech.isListening}
                  onClick={() => {
                    setCaptureChannel("voice");
                    speech.startListening();
                  }}
                >
                  Start voice note
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={disabled || isSavingHabit || !speech.isListening}
                  onClick={speech.stopListening}
                >
                  Stop
                </Button>
              </>
            ) : null}
            <Button type="button" size="sm" disabled={disabled || isSavingHabit} onClick={() => void proposeHabit()}>
              {isSavingHabit ? "Extracting…" : "Review this habit"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            No schedule changes until you approve the proposed interval in Owner verification.
          </p>
        </div>
      </details>

      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer font-medium text-foreground">Driver's-license renewal</summary>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Saved once for you. It is visible from every vehicle but does not belong to any car.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Jurisdiction</span>
              <Input value={jurisdiction} disabled={disabled || isSavingLicense} onChange={(event) => setJurisdiction(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Expiration date</span>
              <Input type="date" value={expirationDate} disabled={disabled || isSavingLicense} onChange={(event) => setExpirationDate(event.target.value)} />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Issuer</span>
            <Input value={issuer} disabled={disabled || isSavingLicense} onChange={(event) => setIssuer(event.target.value)} />
          </label>
          <Button type="button" size="sm" disabled={disabled || isSavingLicense} onClick={() => void saveLicense()}>
            {isSavingLicense ? "Saving…" : existingLicense ? "Update owner deadline" : "Save owner deadline"}
          </Button>
          <p className="text-xs text-muted-foreground">Vehicle OS never asks for or stores your license number here.</p>
        </div>
      </details>
    </div>
  );
}
