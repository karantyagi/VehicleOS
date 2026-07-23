"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ThemeSegmentedToggleProps = {
  className?: string;
  showSystem?: boolean;
};

export function ThemeSegmentedToggle({ className, showSystem = false }: ThemeSegmentedToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn("h-8 w-[4.5rem] rounded-lg bg-muted", className)} aria-hidden />;
  }

  const effective = theme === "system" ? resolvedTheme : theme;
  const isLight = effective === "light";
  const isDark = effective === "dark";

  const segmentClass = (active: boolean) =>
    cn(
      "inline-flex h-7 w-8 items-center justify-center rounded-md transition-colors",
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div
      className={cn("inline-flex items-center gap-0.5 rounded-lg bg-muted/90 p-0.5", className)}
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        className={segmentClass(isLight)}
        aria-pressed={theme === "light"}
        aria-label="Light mode"
        onClick={() => setTheme("light")}
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={segmentClass(isDark)}
        aria-pressed={theme === "dark"}
        aria-label="Dark mode"
        onClick={() => setTheme("dark")}
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
      {showSystem ? (
        <button
          type="button"
          className={segmentClass(theme === "system")}
          aria-pressed={theme === "system"}
          aria-label="System theme"
          onClick={() => setTheme("system")}
        >
          <Monitor className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
