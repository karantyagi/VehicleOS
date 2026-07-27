"use client";

import { Check, X } from "lucide-react";
import { DateField } from "@/components/date-field";
import { MaintenanceRecordEvidenceStrip } from "@/components/maintenance-record-evidence-strip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  appendQuickLineItem,
  MAINTENANCE_QUICK_ITEM_GROUPS,
  MAINTENANCE_QUICK_ITEMS,
} from "@/lib/maintenance-record-quick-items";
import { todayIsoDate } from "@/lib/date-input";
import { cn } from "@/lib/utils";

export type MaintenanceCaptureChannel = "manual" | "receipt" | "voice";

export type MaintenanceRecordDraft = {
  shop: string;
  shopLocation: string;
  serviceDate: string;
  mileage: string;
  total: string;
  lineItems: string;
  ownerNote: string;
  voiceTranscript: string;
  captureChannel: MaintenanceCaptureChannel;
  evidenceStorageKey?: string;
  evidenceFileName?: string;
  voiceStorageKey?: string;
  voiceFileName?: string;
};

export const emptyMaintenanceRecordDraft = (defaultMileage: number): MaintenanceRecordDraft => ({
  shop: "",
  shopLocation: "",
  serviceDate: todayIsoDate(),
  mileage: String(defaultMileage),
  total: "",
  lineItems: "",
  ownerNote: "",
  voiceTranscript: "",
  captureChannel: "manual",
});

export const draftLineItems = (draft: MaintenanceRecordDraft): string[] => {
  const lines = draft.lineItems
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const note = draft.ownerNote.trim();
  if (note) {
    const prefixed = note.startsWith("Note:") ? note : `Note: ${note}`;
    if (!lines.some((line) => line.toLowerCase() === prefixed.toLowerCase())) {
      lines.push(prefixed);
    }
  }

  return lines;
};

type MaintenanceRecordFieldsProps = {
  idPrefix: string;
  draft: MaintenanceRecordDraft;
  disabled?: boolean;
  isSaving?: boolean;
  confirmMessage?: string | null;
  saveLabel?: string;
  vehicleId?: string;
  apiBase?: string;
  onDraftChange: (draft: MaintenanceRecordDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onCaptureError?: (message: string) => void;
};

export function MaintenanceRecordFields({
  idPrefix,
  draft,
  disabled = false,
  isSaving = false,
  confirmMessage = null,
  saveLabel = "Save",
  vehicleId,
  apiBase,
  onDraftChange,
  onSave,
  onCancel,
  onCaptureError,
}: MaintenanceRecordFieldsProps) {
  const addQuickItem = (lineItem: string) => {
    onDraftChange({
      ...draft,
      lineItems: appendQuickLineItem(draft.lineItems, lineItem),
    });
  };

  return (
    <div className="space-y-4">
      <div className="max-w-2xl space-y-2">
        <Label className="text-xs text-muted-foreground">Quick add services</Label>
        <div className="space-y-2">
          {MAINTENANCE_QUICK_ITEM_GROUPS.map((group) => {
            const items = MAINTENANCE_QUICK_ITEMS.filter((item) => item.group === group.id);
            if (items.length === 0) return null;
            return (
              <div key={group.id} className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={disabled || isSaving}
                      className={cn(
                        "rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors",
                        "hover:border-primary/40 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-50",
                      )}
                      onClick={() => addQuickItem(item.lineItem)}
                    >
                      + {item.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-shop`} className="text-xs text-muted-foreground">
            Shop
          </Label>
          <Input
            id={`${idPrefix}-shop`}
            value={draft.shop}
            disabled={disabled || isSaving}
            placeholder="Dealer or DIY"
            onChange={(event) => onDraftChange({ ...draft, shop: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-location`} className="text-xs text-muted-foreground">
            Location
          </Label>
          <Input
            id={`${idPrefix}-location`}
            value={draft.shopLocation}
            disabled={disabled || isSaving}
            placeholder="City, ST"
            onChange={(event) => onDraftChange({ ...draft, shopLocation: event.target.value })}
          />
        </div>
      </div>

      <div className="flex max-w-2xl flex-wrap items-end gap-3">
        <div className="w-[11.5rem] space-y-1.5">
          <Label htmlFor={`${idPrefix}-date`} className="text-xs text-muted-foreground">
            Date
          </Label>
          <DateField
            id={`${idPrefix}-date`}
            value={draft.serviceDate}
            max={todayIsoDate()}
            disabled={disabled || isSaving}
            onChange={(serviceDate) => onDraftChange({ ...draft, serviceDate })}
          />
        </div>
        <div className="w-[8.5rem] space-y-1.5">
          <Label htmlFor={`${idPrefix}-mileage`} className="text-xs text-muted-foreground">
            Mileage
          </Label>
          <Input
            id={`${idPrefix}-mileage`}
            type="number"
            className="tabular-nums"
            value={draft.mileage}
            disabled={disabled || isSaving}
            onChange={(event) => onDraftChange({ ...draft, mileage: event.target.value })}
          />
        </div>
        <div className="w-[7.5rem] space-y-1.5">
          <Label htmlFor={`${idPrefix}-total`} className="text-xs text-muted-foreground">
            Total
          </Label>
          <Input
            id={`${idPrefix}-total`}
            value={draft.total}
            disabled={disabled || isSaving}
            placeholder="$0"
            onChange={(event) => onDraftChange({ ...draft, total: event.target.value })}
          />
        </div>
      </div>

      <div className="max-w-2xl space-y-1.5">
        <Label htmlFor={`${idPrefix}-lines`} className="text-xs text-muted-foreground">
          Line items
        </Label>
        <Textarea
          id={`${idPrefix}-lines`}
          rows={Math.min(6, Math.max(3, draft.lineItems.split("\n").length || 3))}
          value={draft.lineItems}
          disabled={disabled || isSaving}
          placeholder={"Oil and filter changed\nTires rotated"}
          onChange={(event) => onDraftChange({ ...draft, lineItems: event.target.value })}
        />
      </div>

      <div className="max-w-2xl space-y-1.5">
        <Label htmlFor={`${idPrefix}-owner-note`} className="text-xs text-muted-foreground">
          Decision, preference, or phrase
        </Label>
        <Textarea
          id={`${idPrefix}-owner-note`}
          rows={2}
          value={draft.ownerNote}
          disabled={disabled || isSaving}
          placeholder="Skipped cabin filter — replacing myself next month at 60k"
          onChange={(event) => onDraftChange({ ...draft, ownerNote: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Captures why you deferred, your interval habit, or dealer upsell you declined — feeds assistant memory after
          confirm.
        </p>
      </div>

      <MaintenanceRecordEvidenceStrip
        idPrefix={idPrefix}
        draft={draft}
        disabled={disabled || isSaving}
        vehicleId={vehicleId}
        apiBase={apiBase}
        onDraftChange={onDraftChange}
        onCaptureError={onCaptureError}
      />

      {confirmMessage ? (
        <p className="max-w-2xl rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
          {confirmMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={disabled || isSaving} onClick={onSave}>
          <Check className="mr-1.5 h-4 w-4" aria-hidden />
          {saveLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={isSaving} onClick={onCancel}>
          <X className="mr-1.5 h-4 w-4" aria-hidden />
          Cancel
        </Button>
      </div>
    </div>
  );
}
