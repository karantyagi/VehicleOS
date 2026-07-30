"use client";

import { useMemo, useState } from "react";
import { ExtractionStatusBanner } from "@/components/extraction-status-banner";
import { ReceiptCapture, type UploadedReceipt } from "@/components/receipt-capture";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { classifyCaptureIntent } from "@vehicleos/domain";

type OwnerReceiptHandoffProps = {
  vehicleId: string;
  apiBase: string;
  currentMileage: number;
  disabled?: boolean;
  onHandedOff: (result: { needsReview: boolean }) => void;
  onError: (message: string) => void;
  onRouteOwnership?: () => void;
};

export function OwnerReceiptHandoff({
  vehicleId,
  apiBase,
  currentMileage,
  disabled = false,
  onHandedOff,
  onError,
  onRouteOwnership,
}: OwnerReceiptHandoffProps) {
  const [uploadedReceipt, setUploadedReceipt] = useState<UploadedReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const captureIntent = useMemo(() => {
    if (!uploadedReceipt) return null;
    return classifyCaptureIntent({
      filename: uploadedReceipt.storageKey,
      channel: uploadedReceipt.channel,
    });
  }, [uploadedReceipt]);

  const handOff = async () => {
    if (!uploadedReceipt) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/receipts/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: "Service receipt",
          serviceDate: new Date().toISOString().slice(0, 10),
          mileage: currentMileage,
          lineItems: ["See uploaded receipt"],
          total: "$0.00",
          storageKey: uploadedReceipt.storageKey,
          channel: uploadedReceipt.channel,
          filename: uploadedReceipt.storageKey,
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        redirect?: string;
        conflict?: boolean;
        queued?: boolean;
        captureIntent?: { reason: string; route: string };
      };

      if (response.status === 409 && body.redirect === "ownership_import") {
        onError(body.captureIntent?.reason ?? "Use Ownership import for RMV/DMV documents.");
        onRouteOwnership?.();
        return;
      }

      if (!response.ok && response.status !== 409) {
        throw new Error(body.error ?? "Could not hand off receipt");
      }

      setUploadedReceipt(null);
      onHandedOff({ needsReview: body.conflict === true || body.queued === true });
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
        Snap a photo after service — the assistant classifies intent, extracts fields when possible, and routes RMV/DMV docs to Ownership.
      </p>
      <ReceiptCapture
        vehicleId={vehicleId}
        apiBase={apiBase}
        disabled={disabled || isSubmitting}
        minimal
        onUploaded={setUploadedReceipt}
        onError={onError}
      />
      {captureIntent ? (
        <Badge variant="outline" className="text-[10px]">
          Intent: {captureIntent.route.replace("_", " ")} · {Math.round(captureIntent.confidence * 100)}%
        </Badge>
      ) : null}
      {uploadedReceipt ? (
        <Button type="button" disabled={disabled || isSubmitting} onClick={() => void handOff()}>
          {isSubmitting ? "Sending…" : "Hand off to assistant"}
        </Button>
      ) : null}
    </div>
  );
}
