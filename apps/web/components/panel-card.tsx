import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PanelCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  variant?: "raised" | "inset";
  headerAction?: ReactNode;
  hideHeader?: boolean;
};

export function PanelCard({
  title,
  description,
  children,
  className,
  variant = "raised",
  headerAction,
  hideHeader = false,
}: PanelCardProps) {
  const showHeader = !hideHeader && (title || description || headerAction);

  return (
    <Card
      className={cn(
        variant === "inset"
          ? "border-border/70 bg-[hsl(var(--surface-inset))] shadow-none"
          : "surface-panel border-border/80",
        className,
      )}
    >
      {showHeader ? (
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
          <div className="space-y-1.5">
            {title ? (
              <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
            ) : null}
            {description ? (
              <CardDescription className="text-[13px] leading-relaxed">{description}</CardDescription>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("space-y-4", showHeader ? "pt-0" : "pt-6")}>{children}</CardContent>
    </Card>
  );
}
