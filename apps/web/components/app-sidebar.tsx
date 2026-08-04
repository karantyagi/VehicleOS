"use client";

import {
  Archive,
  BookOpen,
  Clock3,
  FileInput,
  Home,
  ListChecks,
  MessageSquareQuote,
  Mic,
  Receipt,
} from "lucide-react";
import { APP_SECTIONS, ASSISTANT_WORKSPACE_GROUP_LABEL, type AppSection } from "@/lib/store/app-ui-store";
import { isSectionVisibleInMode } from "@/lib/console-mode";
import { useAppSectionNavigation } from "@/lib/use-app-section-navigation";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { useVehicleConsoleOptional } from "@/lib/vehicle-console-context";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<AppSection, typeof ListChecks> = {
  reminders: Home,
  attention: ListChecks,
  now: ListChecks,
  timeline: Clock3,
  imports: FileInput,
  receipts: Receipt,
  evidence: Archive,
  context: BookOpen,
  notes: Mic,
  quotes: MessageSquareQuote,
};

type AppSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AppSidebar({ onNavigate, className }: AppSidebarProps) {
  const { goToSection, isSectionActive } = useAppSectionNavigation();
  const vehicleConsole = useVehicleConsoleOptional();
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  const visibleSections = APP_SECTIONS.filter((section) => isSectionVisibleInMode(section.id, consoleMode));

  return (
    <nav className={cn("flex flex-col gap-0.5 px-2", className)} aria-label={ASSISTANT_WORKSPACE_GROUP_LABEL}>
      <p className="px-3 pb-2 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {ASSISTANT_WORKSPACE_GROUP_LABEL}
      </p>
      {visibleSections.map((section) => {
        const Icon = SECTION_ICONS[section.id];
        const isActive = isSectionActive(section.id);
        const attentionCount =
          consoleMode === "owner" && section.id === "attention"
            ? (vehicleConsole?.snapshot?.pendingReminderCount ?? 0) +
              (vehicleConsole?.snapshot?.pendingVerificationCount ?? 0)
            : 0;
        return (
          <button
            key={section.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              goToSection(section.id);
              onNavigate?.();
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-[background-color,box-shadow,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-[0_1px_2px_hsl(158_64%_20%/0.2)]"
                : "text-sidebar-foreground hover:bg-sidebar-accent/70",
            )}
            title={consoleMode === "developer" ? section.description : undefined}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="font-medium leading-tight">{section.label}</span>
            {attentionCount > 0 ? (
              <span
                className={cn(
                  "ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  isActive
                    ? "bg-primary-foreground/18 text-primary-foreground"
                    : "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
                )}
                aria-label={`${attentionCount} open ${attentionCount === 1 ? "item" : "items"} in your attention`}
              >
                {attentionCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
