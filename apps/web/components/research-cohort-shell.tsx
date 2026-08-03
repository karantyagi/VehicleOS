"use client";

import { BarChart3, ChevronRight, ClipboardCheck, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/lib/logo-mark";
import type { SessionUser } from "@/lib/auth/types";
import { cn } from "@/lib/utils";
import { ThemeSegmentedToggle } from "@/components/theme-segmented-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function userInitial(user: SessionUser): string {
  return (user.email?.trim() || user.id).charAt(0).toUpperCase();
}

function userLabel(user: SessionUser): string {
  const local = user.email?.split("@")[0] ?? "Research owner";
  return local.replace(/[._-]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function ResearchAccountMenu({
  user,
  compact = false,
}: {
  user: SessionUser;
  compact?: boolean;
}) {
  return (
    <div className={cn(!compact && "border-t border-sidebar-border px-2 py-3")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-3 rounded-xl text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "p-1" : "w-full px-2 py-2",
            )}
            aria-label="Research account menu"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary text-sm font-semibold text-primary-foreground shadow-sm">
              {userInitial(user)}
            </span>
            {!compact ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{userLabel(user)}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email ?? "Research account"}</span>
              </span>
            ) : null}
            {!compact ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side={compact ? "bottom" : "top"} align={compact ? "end" : "start"} className="w-[min(100vw-2rem,17rem)]">
          <div className="relative overflow-hidden rounded-xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="space-y-0.5 p-1">
              <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5">
                <span className="text-sm font-medium text-foreground">Theme</span>
                <ThemeSegmentedToggle />
              </div>
              <a
                href="/research/account"
                className="group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
              >
                <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
                Account & data
              </a>
            </div>
            <div className="my-1 h-px bg-border/80" />
            <form action="/auth/signout" method="post" className="p-1">
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </form>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ResearchCohortShell({
  children,
  user,
  operator,
  mode = "participant",
}: {
  children: ReactNode;
  user: SessionUser | null;
  operator: boolean;
  mode?: "participant" | "operator";
}) {
  const operatorConsole = mode === "operator";
  const researchLabel = operatorConsole ? "CARFAX import operations" : "CARFAX import research";
  const mobileLabel = operatorConsole ? "VehicleOS operations" : "VehicleOS research";

  const navItem = (href: string, label: string, icon: ReactNode) => (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <div className="min-h-[100dvh] bg-background lg:flex">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar shadow-[1px_0_0_hsl(var(--sidebar-border))] lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-sidebar-border px-4 py-4">
            <Link href={operatorConsole ? "/research/admin" : "/"} className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground no-underline hover:opacity-90">
              <LogoMark />
              <span>VehicleOS</span>
            </Link>
            <p className="mt-2 text-xs font-medium text-primary">{researchLabel}</p>
          </div>
          <nav className="px-3 py-3" aria-label="Research navigation">
            {operatorConsole
              ? navItem("/research/admin", "Evidence & metrics", <BarChart3 className="h-4 w-4" aria-hidden />)
              : (
                <>
                  {navItem("/", "Import research", <ClipboardCheck className="h-4 w-4" aria-hidden />)}
                  {operator ? navItem("/research/admin", "Research results", <BarChart3 className="h-4 w-4" aria-hidden />) : null}
                </>
              )}
          </nav>
          <div className="mx-4 border-t border-sidebar-border" aria-hidden />
          <p className="px-4 pt-4 text-xs leading-5 text-muted-foreground">
            {operatorConsole
              ? "Internal console. Sensitive source access is audited."
              : "Invite-only. Your upload is for parser research, never your maintenance history."}
          </p>
          <div className="flex-1" />
          {user ? <ResearchAccountMenu user={user} /> : null}
        </div>
      </aside>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
          <Link href={operatorConsole ? "/research/admin" : "/"} className="flex min-w-0 flex-1 items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground no-underline">
            <LogoMark />
            <span className="truncate">{mobileLabel}</span>
          </Link>
          {user ? <ResearchAccountMenu user={user} compact /> : null}
        </header>
        <main id="main-content" className="flex-1 bg-muted/25 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className={cn("mx-auto w-full", operatorConsole ? "max-w-6xl" : "max-w-3xl")}>{children}</div>
        </main>
      </div>
    </div>
  );
}
