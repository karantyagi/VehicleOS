"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  variant?: "icon" | "menu";
};

export function ThemeToggle({ className, variant = "menu" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return variant === "icon" ? (
      <Button type="button" variant="outline" size="icon" className={className} disabled aria-hidden>
        <Sun className="h-4 w-4" />
      </Button>
    ) : null;
  }

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label =
    theme === "system" ? `Theme: system (${resolvedTheme})` : theme === "dark" ? "Theme: dark" : "Theme: light";

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={className}
        onClick={cycle}
        aria-label={label}
        title={label}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/70",
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <span className="flex-1 font-medium">{label}</span>
    </button>
  );
}
