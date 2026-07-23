"use client";

import { ChevronRight, LogOut, Moon, Settings } from "lucide-react";
import Link from "next/link";
import { ThemeSegmentedToggle } from "@/components/theme-segmented-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

type AccountMenuProps = {
  user: SessionUser;
  className?: string;
};

function userInitial(user: SessionUser): string {
  const source = user.email?.trim() || user.id;
  return source.charAt(0).toUpperCase();
}

function userLabel(user: SessionUser): string {
  if (user.email) {
    const local = user.email.split("@")[0] ?? user.email;
    return local.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Owner";
}

export function AccountMenu({ user, className }: AccountMenuProps) {
  const subtitle = user.email ?? "Signed in · early access";

  return (
    <div className={cn("border-t border-sidebar-border px-2 py-3", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-primary text-sm font-semibold text-primary-foreground shadow-sm">
              {userInitial(user)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{userLabel(user)}</span>
              <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[min(100vw-2rem,17rem)]">
          <div className="relative overflow-hidden rounded-xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="space-y-0.5 p-1">
              <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5">
                <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                  <Moon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Theme
                </span>
                <ThemeSegmentedToggle />
              </div>
              <Link
                href="/settings"
                className="group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
              >
                <span className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
                <Settings className="h-4 w-4 text-muted-foreground" aria-hidden />
                Settings
              </Link>
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
