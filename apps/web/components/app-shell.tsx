"use client";

import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ConsoleKeyboardShortcuts } from "@/components/console-keyboard-shortcuts";
import { CommandMenu, CommandMenuTrigger, SidebarUtilityRow } from "@/components/command-menu";
import { SidebarAccount } from "@/components/sidebar-account";
import { ThemeToggle } from "@/components/theme-toggle";
import { VehicleContextBar } from "@/components/vehicle-context-bar";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/types";
import { CONSOLE_SECTIONS, useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

type AppShellProps = {
  user: SessionUser | null;
  sidebarHeader: ReactNode;
  mobileBar?: ReactNode;
  children: ReactNode;
};

export function AppShell({ user, sidebarHeader, mobileBar, children }: AppShellProps) {
  const mobileNavOpen = useAppUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useAppUiStore((state) => state.setMobileNavOpen);
  const activeSection = useAppUiStore((state) => state.activeSection);
  const isConsoleLayout = CONSOLE_SECTIONS.includes(activeSection);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen, setMobileNavOpen]);

  const sidebarBody = (
    <>
      <div className="border-b border-sidebar-border px-4 py-4">{sidebarHeader}</div>
      <SidebarUtilityRow />
      <AppSidebar className="flex-1 overflow-y-auto py-2" />
      {user ? <SidebarAccount user={user} /> : null}
    </>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <CommandMenu />
      <ConsoleKeyboardShortcuts />
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar shadow-[1px_0_0_hsl(var(--sidebar-border))] lg:block">
        <div className="sticky top-0 flex h-screen flex-col">{sidebarBody}</div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <div className="min-w-0 flex-1">{mobileBar ?? sidebarHeader}</div>
          <CommandMenuTrigger compact />
          <ThemeToggle variant="icon" />
        </header>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-30 lg:hidden" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]"
              aria-label="Close menu overlay"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside
              className={cn(
                "absolute left-0 top-0 flex h-full w-[min(100vw-3rem,18rem)] flex-col border-r border-sidebar-border bg-sidebar shadow-xl",
              )}
            >
              {sidebarBody}
            </aside>
          </div>
        ) : null}

        <main id="main-content" className="flex-1 bg-muted/25 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div
            className={cn(
              "mx-auto w-full space-y-8",
              isConsoleLayout ? "max-w-6xl" : "max-w-3xl",
            )}
          >
            <VehicleContextBar />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
