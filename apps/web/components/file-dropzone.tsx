"use client";

import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type FileDropzoneProps = {
  label: string;
  hint: string;
  accept: string;
  disabled?: boolean;
  busy?: boolean;
  onFile: (file: File) => void;
  className?: string;
};

export function FileDropzone({
  label,
  hint,
  accept,
  disabled,
  busy,
  onFile,
  className,
}: FileDropzoneProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 focus-within:ring-2 focus-within:ring-ring",
        (disabled || busy) && "pointer-events-none opacity-60",
        className,
      )}
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Upload className="h-5 w-5" aria-hidden />
      </div>
      <span className="text-sm font-medium">{busy ? "Uploading…" : label}</span>
      <span className="mt-1 text-xs text-muted-foreground">{hint}</span>
      <input
        type="file"
        accept={accept}
        disabled={disabled || busy}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}
