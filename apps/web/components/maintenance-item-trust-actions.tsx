"use client";

import { useEffect, useState } from "react";
import { Gauge, History, Plus } from "lucide-react";
import {
  MaintenanceRecordFields,
  draftLineItems,
  type MaintenanceRecordDraft,
} from "@/components/maintenance-record-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TimelineEntry } from "@/lib/console-types";
import {
  buildMaintenanceCorrectionDraft,
  buildMaintenanceRecordDraft,
  maintenancePatchFromDraft,
} from "@/lib/maintenance-item-trust";

type TrustActionMode = "record" | "correct" | "odometer" | null;

type MaintenanceItemTrustActionsProps = {
  entryId: string;
  recordLineItem: string;
  currentMileage: number;
  baselineEntry?: TimelineEntry | null;
  disabled?: boolean;
  onRecordService?: (draft: MaintenanceRecordDraft) => Promise<void>;
  onCorrectService?: (serviceId: string, patch: Partial<TimelineEntry>) => Promise<void>;
  onUpdateMileage?: (mileage: number) => Promise<void>;
};

export function MaintenanceItemTrustActions({
  entryId,
  recordLineItem,
  currentMileage,
  baselineEntry = null,
  disabled = false,
  onRecordService,
  onCorrectService,
  onUpdateMileage,
}: MaintenanceItemTrustActionsProps) {
  const [mode, setMode] = useState<TrustActionMode>(null);
  const [recordDraft, setRecordDraft] = useState<MaintenanceRecordDraft | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState<MaintenanceRecordDraft | null>(null);
  const [odometerInput, setOdometerInput] = useState(String(currentMileage));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOdometerInput(String(currentMileage));
  }, [currentMileage]);

  const chooseMode = (nextMode: Exclude<TrustActionMode, null>) => {
    setError("");
    setMode((current) => (current === nextMode ? null : nextMode));
    if (nextMode === "record") {
      setRecordDraft(buildMaintenanceRecordDraft(currentMileage, recordLineItem));
    }
    if (nextMode === "correct" && baselineEntry) {
      setCorrectionDraft(buildMaintenanceCorrectionDraft(baselineEntry));
    }
  };

  const saveRecord = async () => {
    if (!onRecordService || !recordDraft || draftLineItems(recordDraft).length === 0) return;
    setIsSaving(true);
    setError("");
    try {
      await onRecordService(recordDraft);
      setMode(null);
      setRecordDraft(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this service.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveCorrection = async () => {
    if (!onCorrectService || !baselineEntry || !correctionDraft) return;
    const mileage = Number(correctionDraft.mileage);
    if (!Number.isFinite(mileage) || mileage <= 0 || draftLineItems(correctionDraft).length === 0) {
      setError("Enter a valid mileage and at least one service line.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onCorrectService(
        baselineEntry.serviceId,
        maintenancePatchFromDraft(correctionDraft),
      );
      setMode(null);
      setCorrectionDraft(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not correct this service.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveMileage = async () => {
    if (!onUpdateMileage) return;
    const mileage = Number(odometerInput);
    if (!Number.isFinite(mileage) || mileage <= 0) {
      setError("Enter a valid odometer reading.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onUpdateMileage(Math.round(mileage));
      setMode(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update mileage.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-border/70 bg-background/75 p-3.5">
      <p className="text-sm font-semibold text-foreground">Keep this accurate</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Saved changes immediately recalculate this reminder.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "record" ? "secondary" : "outline"}
          disabled={disabled || isSaving || !onRecordService}
          aria-pressed={mode === "record"}
          onClick={() => chooseMode("record")}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          Record rotation
        </Button>
        {baselineEntry ? (
          <Button
            type="button"
            size="sm"
            variant={mode === "correct" ? "secondary" : "outline"}
            disabled={disabled || isSaving || !onCorrectService}
            aria-pressed={mode === "correct"}
            onClick={() => chooseMode("correct")}
          >
            <History className="mr-1.5 h-4 w-4" aria-hidden />
            Correct last rotation
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={mode === "odometer" ? "secondary" : "outline"}
          disabled={disabled || isSaving || !onUpdateMileage}
          aria-pressed={mode === "odometer"}
          onClick={() => chooseMode("odometer")}
        >
          <Gauge className="mr-1.5 h-4 w-4" aria-hidden />
          Update odometer
        </Button>
      </div>

      {mode === "record" && recordDraft ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <MaintenanceRecordFields
            idPrefix={`record-${entryId}`}
            draft={recordDraft}
            disabled={disabled}
            isSaving={isSaving}
            saveLabel="Save rotation"
            onDraftChange={setRecordDraft}
            onSave={() => void saveRecord()}
            onCancel={() => setMode(null)}
          />
        </div>
      ) : null}

      {mode === "correct" && correctionDraft && baselineEntry ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <MaintenanceRecordFields
            idPrefix={`correct-${entryId}`}
            draft={correctionDraft}
            disabled={disabled}
            isSaving={isSaving}
            saveLabel="Save correction"
            onDraftChange={setCorrectionDraft}
            onSave={() => void saveCorrection()}
            onCancel={() => setMode(null)}
          />
        </div>
      ) : null}

      {mode === "odometer" ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <Label htmlFor={`odometer-${entryId}`} className="text-xs text-muted-foreground">
            Current odometer
          </Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Input
              id={`odometer-${entryId}`}
              type="number"
              inputMode="numeric"
              className="max-w-[10rem] tabular-nums"
              value={odometerInput}
              disabled={disabled || isSaving}
              onChange={(event) => setOdometerInput(event.target.value)}
            />
            <Button
              type="button"
              size="sm"
              disabled={disabled || isSaving}
              onClick={() => void saveMileage()}
            >
              {isSaving ? "Saving…" : "Save mileage"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isSaving}
              onClick={() => setMode(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
