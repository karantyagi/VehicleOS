import { NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

type AssistantDiaryMarkProps = {
  className?: string;
  size?: "sm" | "md";
};

export function AssistantDiaryMark({ className, size = "sm" }: AssistantDiaryMarkProps) {
  const iconBox = size === "md" ? "h-8 w-8 rounded-xl" : "h-7 w-7 rounded-lg";
  const icon = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const text = size === "md" ? "text-sm" : "text-xs";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-[inset_0_1px_0_hsl(var(--primary)/0.12)] ring-1 ring-primary/20",
          iconBox,
        )}
      >
        <NotebookPen className={icon} strokeWidth={2} aria-hidden />
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-sidebar bg-primary" aria-hidden />
      </span>
      <span className={cn("font-semibold leading-none tracking-tight text-foreground", text)}>
        Assistant <span className="text-primary">Diary</span>
      </span>
    </div>
  );
}
