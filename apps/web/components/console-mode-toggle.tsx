"use client";

import { Code2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppUiStore } from "@/lib/store/app-ui-store";

type ConsoleModeToggleProps = {
  className?: string;
  compact?: boolean;
};

export function ConsoleModeToggle({ className, compact = false }: ConsoleModeToggleProps) {
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  const setConsoleMode = useAppUiStore((state) => state.setConsoleMode);
  const isDeveloper = consoleMode === "developer";

  return (
    <div className={cn("space-y-1.5", className)}>
      {!compact ? (
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">View</p>
      ) : null}
      <div
        className={cn(
          "grid grid-cols-2 gap-0.5 rounded-lg border border-sidebar-border bg-muted/40 p-0.5",
          compact && "w-full",
        )}
        role="group"
        aria-label="Console view mode"
      >
        <Button
          type="button"
          size="sm"
          variant={!isDeveloper ? "default" : "ghost"}
          className={cn("h-8 gap-1.5 text-xs", !isDeveloper && "shadow-sm")}
          aria-pressed={!isDeveloper}
          onClick={() => setConsoleMode("owner")}
        >
          <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Owner
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isDeveloper ? "default" : "ghost"}
          className={cn("h-8 gap-1.5 text-xs", isDeveloper && "shadow-sm")}
          aria-pressed={isDeveloper}
          onClick={() => setConsoleMode("developer")}
        >
          <Code2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Developer
        </Button>
      </div>
    </div>
  );
}

export function DeveloperModeBanner() {
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  if (consoleMode !== "developer") return null;

  return (
    <p className="rounded-lg border border-dashed border-amber-500/35 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Developer view</span> — pipelines, imports, and diagnostics visible.
      Switch to Owner for the shipped peek.
    </p>
  );
}
