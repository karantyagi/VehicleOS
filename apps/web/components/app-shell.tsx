"use client";

import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { CarIdentityNav } from "@/components/car-identity-nav";
import { ConsoleKeyboardShortcuts } from "@/components/console-keyboard-shortcuts";
import { ConsoleModeHydrator } from "@/components/console-mode-hydrator";
import { ConsoleModeToggle, DeveloperModeBanner } from "@/components/console-mode-toggle";
import { CommandMenu, CommandMenuTrigger, SidebarUtilityRow } from "@/components/command-menu";
import { AccountMenu } from "@/components/account-menu";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { PwaSectionLauncher } from "@/components/pwa-section-launcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { VehicleContextBar } from "@/components/vehicle-context-bar";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/types";
import { GarageProvider } from "@/lib/garage/garage-context";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

type AppShellProps = {
  user: SessionUser | null;
  sidebarHeader: ReactNode;
  mobileBar?: ReactNode;
  children: ReactNode;
};

export function AppShell({ user, sidebarHeader, mobileBar, children }: AppShellProps) {
  const pathname = usePathname();
  const mobileNavOpen = useAppUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useAppUiStore((state) => state.setMobileNavOpen);
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  const setupFlowActive = useAppUiStore((state) => state.setupFlowActive);
  const isDeveloper = consoleMode === "developer";
  const isAssistantWorkspace = pathname === "/";
  const focusSetup = setupFlowActive && isAssistantWorkspace;

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
      {isDeveloper ? <SidebarUtilityRow /> : null}
      <div className="px-3 pb-2">
        <ConsoleModeToggle />
      </div>
      <CarIdentityNav className="pb-1" />
      <div className="mx-4 border-t border-sidebar-border" aria-hidden />
      <AppSidebar className="flex-1 overflow-y-auto py-2" />
      {user ? <AccountMenu user={user} /> : null}
    </>
  );

  return (
    <GarageProvider userId={user?.id ?? null}>
      <div className="min-h-[100dvh] bg-background lg:flex">
      <Suspense fallback={null}>
        <PwaSectionLauncher />
      </Suspense>
      <ConsoleModeHydrator />
      <CommandMenu />
      <ConsoleKeyboardShortcuts />
      <aside
        className={cn(
          "hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar shadow-[1px_0_0_hsl(var(--sidebar-border))] lg:block",
          focusSetup && "lg:hidden",
        )}
      >
        <div className="sticky top-0 flex h-screen flex-col">{sidebarBody}</div>
      </aside>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden",
            focusSetup && "border-transparent bg-transparent backdrop-blur-none supports-[backdrop-filter]:bg-transparent",
          )}
        >
          {focusSetup ? null : (
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
          )}
          <div className="min-w-0 flex-1">{mobileBar ?? sidebarHeader}</div>
          {focusSetup && user ? (
            <div className="shrink-0">
              <AccountMenu user={user} />
            </div>
          ) : null}
          {!focusSetup && isDeveloper ? <CommandMenuTrigger compact /> : null}
          {!focusSetup ? <ThemeToggle variant="icon" /> : null}
        </header>

        {!focusSetup && mobileNavOpen ? (
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

        <main
          id="main-content"
          className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8", focusSetup ? "bg-background" : "bg-muted/25")}
        >
          <div
            className={cn(
              "mx-auto w-full",
              isDeveloper && !focusSetup ? "space-y-8" : "space-y-6",
              focusSetup ? "max-w-lg" : isAssistantWorkspace ? "max-w-6xl" : "max-w-3xl",
            )}
          >
            {!focusSetup ? <VehicleContextBar /> : null}
            {!focusSetup ? <DeveloperModeBanner /> : null}
            {!focusSetup && user ? <PwaInstallBanner minimal={!isDeveloper} /> : null}
            {focusSetup && user ? (
              <div className="hidden justify-end lg:flex">
                <AccountMenu user={user} />
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
    </GarageProvider>
  );
}
