"use client";

import {
  Archive,
  BookOpen,
  Clock3,
  ListChecks,
  MessageSquareQuote,
  Mic,
  Receipt,
} from "lucide-react";
import { APP_SECTIONS, type AppSection, useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<AppSection, typeof ListChecks> = {
  now: ListChecks,
  timeline: Clock3,
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
  const activeSection = useAppUiStore((state) => state.activeSection);
  const setActiveSection = useAppUiStore((state) => state.setActiveSection);

  return (
    <nav className={cn("flex flex-col gap-0.5 px-2", className)} aria-label="Main">
      <p className="px-3 pb-2 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Workspace
      </p>
      {APP_SECTIONS.map((section) => {
        const Icon = SECTION_ICONS[section.id];
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              setActiveSection(section.id);
              onNavigate?.();
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-[background-color,box-shadow,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-[0_1px_2px_hsl(158_64%_20%/0.2)]"
                : "text-sidebar-foreground hover:bg-sidebar-accent/70",
            )}
            title={section.description}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="font-medium leading-tight">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
