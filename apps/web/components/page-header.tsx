import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, badge, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
            {title}
          </h1>
          {badge}
        </div>
        <p className="max-w-xl text-pretty text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
          {description}
        </p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}
