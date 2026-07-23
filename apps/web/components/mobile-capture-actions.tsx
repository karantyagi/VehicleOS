"use client";

import { Camera, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileCaptureActionsProps = {
  accept: string;
  disabled?: boolean;
  busy?: boolean;
  onFile: (file: File) => void;
  className?: string;
};

export function MobileCaptureActions({
  accept,
  disabled,
  busy,
  onFile,
  className,
}: MobileCaptureActionsProps) {
  const blocked = disabled || busy;

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <label
        className={cn(
          "flex min-h-[3.25rem] cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-4 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 focus-within:ring-2 focus-within:ring-ring",
          blocked && "pointer-events-none opacity-60",
        )}
      >
        <Camera className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        Take photo
        <input
          type="file"
          accept={accept}
          capture="environment"
          disabled={blocked}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
      </label>
      <label
        className={cn(
          "flex min-h-[3.25rem] cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-4 text-sm font-medium transition-colors hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring",
          blocked && "pointer-events-none opacity-60",
        )}
      >
        <Upload className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        Choose file or PDF
        <input
          type="file"
          accept={accept}
          disabled={blocked}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
