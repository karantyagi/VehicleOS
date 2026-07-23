import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ConsoleSplitProps = {
  list: ReactNode;
  detail: ReactNode;
  emptyDetail?: ReactNode;
  hasSelection: boolean;
  className?: string;
};

export function ConsoleSplit({ list, detail, emptyDetail, hasSelection, className }: ConsoleSplitProps) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-6", className)}>
      <div className="min-w-0">{list}</div>
      <div className="min-w-0 lg:sticky lg:top-32 lg:self-start">
        {hasSelection ? detail : (emptyDetail ?? <ConsoleDetailPlaceholder />)}
      </div>
    </div>
  );
}

export function ConsoleDetailPlaceholder() {
  return (
    <div className="surface-inset flex min-h-[12rem] flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">Select a row</p>
      <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
        Details appear here — keyboard-friendly tables on the left, inspection panel on the right.
      </p>
    </div>
  );
}

export function ConsoleDetailPanel({
  title,
  children,
  actions,
  className,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface-panel console-motion-fade flex flex-col overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border/80 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      <div className="space-y-3 px-4 py-4 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
