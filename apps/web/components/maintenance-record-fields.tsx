"use client";

import { Check, X } from "lucide-react";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayIsoDate } from "@/lib/date-input";

export type MaintenanceRecordDraft = {
  shop: string;
  shopLocation: string;
  serviceDate: string;
  mileage: string;
  total: string;
  lineItems: string;
  ownerNote: string;
  voiceTranscript: string;
  captureChannel: "manual" | "receipt" | "voice";
  evidenceStorageKey?: string;
  evidenceFileName?: string;
  voiceStorageKey?: string;
  voiceFileName?: string;
  attentionTaskId?: string;
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

export const draftLineItems = (draft: MaintenanceRecordDraft): string[] =>
  draft.lineItems
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

type MaintenanceRecordFieldsProps = {
  idPrefix: string;
  draft: MaintenanceRecordDraft;
  disabled?: boolean;
  isSaving?: boolean;
  confirmMessage?: string | null;
  saveLabel?: string;
  onDraftChange: (draft: MaintenanceRecordDraft) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function MaintenanceRecordFields({
  idPrefix,
  draft,
  disabled = false,
  isSaving = false,
  confirmMessage = null,
  saveLabel = "Save",
  onDraftChange,
  onSave,
  onCancel,
}: MaintenanceRecordFieldsProps) {
  return (
    <div className="space-y-3">
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
          placeholder={"Oil change\nTire rotation"}
          onChange={(event) => onDraftChange({ ...draft, lineItems: event.target.value })}
        />
      </div>
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
