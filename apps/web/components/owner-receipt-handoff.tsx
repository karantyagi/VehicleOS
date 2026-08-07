"use client";

import { useMemo, useState } from "react";
import { Camera, ChevronDown, FileCheck2 } from "lucide-react";
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
  initialFile?: File | null;
  onHandedOff: (result: { needsReview: boolean }) => void;
  onError: (message: string) => void;
  onRouteOwnership?: () => void;
  onInitialFileStored?: () => void;
  onInitialFileDiscarded?: () => void;
  onPendingChange?: (pending: boolean) => void;
};

export function OwnerReceiptHandoff({
  vehicleId,
  apiBase,
  currentMileage,
  disabled = false,
  initialFile = null,
  onHandedOff,
  onError,
  onRouteOwnership,
  onInitialFileStored,
  onInitialFileDiscarded,
  onPendingChange,
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
    <div className="space-y-5">
      <section className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.075] via-primary/[0.025] to-transparent p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Camera className="h-5 w-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Keep the receipt when exact details matter</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Take a photo or add a PDF. You can crop a photo before it leaves your phone, then save the receipt to this vehicle.
            </p>
          </div>
        </div>
      </section>
      <p className="sr-only">
        Receipt uploads remain scoped to this vehicle and can be reviewed later.
      </p>
      <ReceiptCapture
        vehicleId={vehicleId}
        apiBase={apiBase}
        disabled={disabled || isSubmitting}
        minimal
        initialFile={initialFile}
        onUploaded={setUploadedReceipt}
        onError={onError}
        onInitialFileStored={onInitialFileStored}
        onInitialFileDiscarded={onInitialFileDiscarded}
        onPendingChange={onPendingChange}
      />
      {captureIntent ? (
        <Badge variant="outline" className="text-[10px]">
          Intent: {captureIntent.route.replace("_", " ")} · {Math.round(captureIntent.confidence * 100)}%
        </Badge>
      ) : null}
      {uploadedReceipt ? (
        <Button
          type="button"
          className="h-11 w-full rounded-xl"
          disabled={disabled || isSubmitting}
          onClick={() => void handOff()}
        >
          <FileCheck2 className="h-4 w-4" aria-hidden />
          {isSubmitting ? "Saving receipt..." : "Save receipt"}
        </Button>
      ) : null}
      <details className="group rounded-lg border border-border/75 bg-muted/[0.14] px-3 py-2.5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-muted-foreground marker:content-none">
          About receipt details
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <ExtractionStatusBanner variant="llm-not-ready-receipt" className="mt-3" />
      </details>
    </div>
  );
}
