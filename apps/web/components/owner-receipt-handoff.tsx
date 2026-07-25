"use client";

import { useState } from "react";
import { ExtractionStatusBanner } from "@/components/extraction-status-banner";
import { ReceiptCapture, type UploadedReceipt } from "@/components/receipt-capture";
import { Button } from "@/components/ui/button";

type OwnerReceiptHandoffProps = {
  vehicleId: string;
  apiBase: string;
  currentMileage: number;
  disabled?: boolean;
  onHandedOff: () => void;
  onError: (message: string) => void;
};

export function OwnerReceiptHandoff({
  vehicleId,
  apiBase,
  currentMileage,
  disabled = false,
  onHandedOff,
  onError,
}: OwnerReceiptHandoffProps) {
  const [uploadedReceipt, setUploadedReceipt] = useState<UploadedReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handOff = async () => {
    if (!uploadedReceipt) return;
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: "Service receipt",
          serviceDate: today,
          mileage: currentMileage,
          lineItems: ["See uploaded receipt"],
          total: "$0.00",
          storageKey: uploadedReceipt.storageKey,
          channel: uploadedReceipt.channel,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok && response.status !== 409) {
        throw new Error(body.error ?? "Could not hand off receipt");
      }
      setUploadedReceipt(null);
      onHandedOff();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not hand off receipt");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <ExtractionStatusBanner variant="llm-not-ready-receipt" />
      <p className="text-sm text-muted-foreground">
        Snap a photo after service — add VehicleOS to your home screen for one-tap capture.
      </p>
      <ReceiptCapture
        vehicleId={vehicleId}
        apiBase={apiBase}
        disabled={disabled || isSubmitting}
        minimal
        onUploaded={setUploadedReceipt}
        onError={onError}
      />
      {uploadedReceipt ? (
        <Button type="button" disabled={disabled || isSubmitting} onClick={() => void handOff()}>
          {isSubmitting ? "Sending…" : "Hand off to assistant"}
        </Button>
      ) : null}
    </div>
  );
}
