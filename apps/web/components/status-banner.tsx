"use client";

import { Alert } from "@/components/ui/alert";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type StatusBannerProps = {
  message: string;
  variant?: "info" | "destructive";
  onDismiss?: () => void;
};

export function StatusBanner({ message, variant = "info", onDismiss }: StatusBannerProps) {
  if (!message.trim()) return null;

  return (
    <Alert variant={variant === "destructive" ? "destructive" : "info"} className="flex items-start justify-between gap-3">
      <p className="leading-relaxed">{message}</p>
      {onDismiss ? (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onDismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </Alert>
  );
}
