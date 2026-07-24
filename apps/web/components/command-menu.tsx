"use client";

import { Command } from "cmdk";
import {
  CarFront,
  Archive,
  BellRing,
  BookOpen,
  Clock3,
  FileInput,
  ListChecks,
  MessageSquareQuote,
  Mic,
  Code2,
  Eye,
  Moon,
  Monitor,
  Receipt,
  Rows3,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APP_SECTIONS, SECTION_SHORTCUTS, useAppUiStore } from "@/lib/store/app-ui-store";
import { isSectionVisibleInMode } from "@/lib/console-mode";
import { useAppSectionNavigation } from "@/lib/use-app-section-navigation";
import { cn } from "@/lib/utils";

const SECTION_ICONS = {
  reminders: BellRing,
  now: ListChecks,
  timeline: Clock3,
  imports: FileInput,
  receipts: Receipt,
  evidence: Archive,
  context: BookOpen,
  notes: Mic,
  quotes: MessageSquareQuote,
} as const;

export function CommandMenu() {
  const router = useRouter();
  const { goToSection } = useAppSectionNavigation();
  const { setTheme } = useTheme();
  const commandOpen = useAppUiStore((s) => s.commandOpen);
  const setCommandOpen = useAppUiStore((s) => s.setCommandOpen);
  const consoleMode = useAppUiStore((s) => s.consoleMode);
  const setConsoleMode = useAppUiStore((s) => s.setConsoleMode);
  const toggleDensity = useAppUiStore((s) => s.toggleDensity);
  const visibleSections = APP_SECTIONS.filter((section) => isSectionVisibleInMode(section.id, consoleMode));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(!useAppUiStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent showClose={false} className="gap-0 sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Command menu</DialogTitle>
        </DialogHeader>
        <Command className="rounded-xl [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-1.5 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <Command.Input
              placeholder="Search…"
              autoFocus
              className="flex h-11 min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              aria-label="Close"
              onClick={() => setCommandOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Command.List className="max-h-[min(60vh,280px)] overflow-y-auto p-1.5">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">No results</Command.Empty>
            <Command.Group heading="Go">
              {visibleSections.map((section) => {
                const Icon = SECTION_ICONS[section.id];
                return (
                  <Command.Item
                    key={section.id}
                    value={`${section.label} ${section.id} ${section.description}`}
                    onSelect={() => {
                      goToSection(section.id);
                      setCommandOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md text-sm aria-selected:bg-muted"
                  >
                    <Icon className="text-muted-foreground" aria-hidden />
                    <span className="font-medium">{section.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
            <Command.Group heading="Actions">
              <Command.Item
                value="Owner verification vehicle record driving profile"
                onSelect={() => {
                  setCommandOpen(false);
                  router.push("/garage?tab=car");
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md text-sm aria-selected:bg-muted"
              >
                <CarFront className="text-muted-foreground" aria-hidden />
                <span className="font-medium">Owner</span>
              </Command.Item>
              <Command.Item
                value="Account login identity"
                onSelect={() => {
                  setCommandOpen(false);
                  router.push("/settings");
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md text-sm aria-selected:bg-muted"
              >
                <Settings className="text-muted-foreground" aria-hidden />
                <span className="font-medium">Account</span>
              </Command.Item>
              <Command.Item
                value="Light"
                onSelect={() => {
                  setTheme("light");
                  setCommandOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md text-sm aria-selected:bg-muted"
              >
                <Sun className="text-muted-foreground" aria-hidden />
                <span className="font-medium">Light</span>
              </Command.Item>
              <Command.Item
                value="Dark"
                onSelect={() => {
                  setTheme("dark");
                  setCommandOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md text-sm aria-selected:bg-muted"
              >
                <Moon className="text-muted-foreground" aria-hidden />
                <span className="font-medium">Dark</span>
              </Command.Item>
              <Command.Item
                value="System appearance"
                onSelect={() => {
                  setTheme("system");
                  setCommandOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md text-sm aria-selected:bg-muted"
              >
                <Monitor className="text-muted-foreground" aria-hidden />
                <span className="font-medium">System</span>
              </Command.Item>
              <Command.Item
                value="Toggle owner developer view mode"
                onSelect={() => {
                  setConsoleMode(consoleMode === "developer" ? "owner" : "developer");
                  setCommandOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md text-sm aria-selected:bg-muted"
              >
                {consoleMode === "developer" ? (
                  <Eye className="text-muted-foreground" aria-hidden />
                ) : (
                  <Code2 className="text-muted-foreground" aria-hidden />
                )}
                <span className="font-medium">
                  {consoleMode === "developer" ? "Switch to Owner view" : "Switch to Developer view"}
                </span>
              </Command.Item>
              {consoleMode === "developer" ? (
                <Command.Item
                  value="Toggle density compact comfortable"
                  onSelect={() => {
                    toggleDensity();
                    setCommandOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md text-sm aria-selected:bg-muted"
                >
                  <Rows3 className="text-muted-foreground" aria-hidden />
                  <span className="font-medium">Toggle density</span>
                </Command.Item>
              ) : null}
            </Command.Group>
          </Command.List>
          <div className="border-t border-border px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            <span className="mr-2">
              <kbd className="rounded border border-border px-1 font-mono">⌘K</kbd>
            </span>
            <span className="mr-2">
              <kbd className="rounded border border-border px-1 font-mono">/</kbd> search
            </span>
            {visibleSections.map((section) => (
              <span key={section.id} className="mr-2">
                <kbd className="rounded border border-border px-1 font-mono">⌘{SECTION_SHORTCUTS[section.id]}</kbd>{" "}
                {section.label}
              </span>
            ))}
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

type CommandMenuTriggerProps = {
  className?: string;
  compact?: boolean;
};

export function CommandMenuTrigger({ className, compact = false }: CommandMenuTriggerProps) {
  const setCommandOpen = useAppUiStore((s) => s.setCommandOpen);

  return (
    <button
      type="button"
      onClick={() => setCommandOpen(true)}
      aria-label="Command menu"
      title="Command menu (⌘K)"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-sidebar-border bg-background/50 text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "h-9 w-9 shrink-0" : "h-9 min-w-0 flex-1 px-2",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      {!compact ? (
        <kbd className="ml-auto hidden rounded border border-border/80 bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] leading-none sm:inline">
          ⌘K
        </kbd>
      ) : null}
    </button>
  );
}

export function SidebarUtilityRow({ className }: { className?: string }) {
  return (
    <div className={cn("px-3 pb-1 pt-2", className)}>
      <CommandMenuTrigger />
    </div>
  );
}
