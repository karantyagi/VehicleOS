"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppUiStore } from "@/lib/store/app-ui-store";

type ConsoleModeToggleProps = {
  className?: string;
};

/** A deliberate escape hatch for local/operator work, not an owner-facing view switch. */
export function ConsoleModeToggle({ className }: ConsoleModeToggleProps) {
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  const setConsoleMode = useAppUiStore((state) => state.setConsoleMode);

  if (consoleMode !== "developer") return null;

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn("h-8 w-full justify-start gap-2 px-3 text-xs text-muted-foreground hover:text-foreground", className)}
      onClick={() => setConsoleMode("owner")}
    >
      <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Exit developer tools
    </Button>
  );
}

export function DeveloperModeBanner() {
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  if (consoleMode !== "developer") return null;

  return (
    <p className="rounded-lg border border-dashed border-amber-500/35 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Developer tools active</span> — pipelines, imports, and diagnostics visible.
      Exit developer tools to return to the owner experience.
    </p>
  );
}
