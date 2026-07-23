"use client";

import { Command } from "cmdk";
import {
  Archive,
  Clock3,
  LayoutGrid,
  ListChecks,
  Monitor,
  Moon,
  Receipt,
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
import { APP_SECTIONS, useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

const SECTION_ICONS = {
  now: ListChecks,
  timeline: Clock3,
  receipts: Receipt,
  evidence: Archive,
  more: LayoutGrid,
} as const;

export function CommandMenu() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const commandOpen = useAppUiStore((s) => s.commandOpen);
  const setCommandOpen = useAppUiStore((s) => s.setCommandOpen);
  const setActiveSection = useAppUiStore((s) => s.setActiveSection);

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
              {APP_SECTIONS.map((section) => {
                const Icon = SECTION_ICONS[section.id];
                return (
                  <Command.Item
                    key={section.id}
                    value={`${section.label} ${section.id} ${section.description}`}
                    onSelect={() => {
                      setActiveSection(section.id);
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
                value="Settings"
                onSelect={() => {
                  setCommandOpen(false);
                  router.push("/settings");
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md text-sm aria-selected:bg-muted"
              >
                <Settings className="text-muted-foreground" aria-hidden />
                <span className="font-medium">Settings</span>
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
            </Command.Group>
          </Command.List>
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

function ThemeToggleDock() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 shrink-0 rounded-lg border border-sidebar-border bg-background/50" aria-hidden />
    );
  }

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label =
    theme === "system" ? `Appearance: system (${resolvedTheme})` : theme === "dark" ? "Dark mode" : "Light mode";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-background/50 text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

export function SidebarUtilityRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 px-3 pb-1 pt-2", className)}>
      <CommandMenuTrigger />
      <ThemeToggleDock />
    </div>
  );
}
