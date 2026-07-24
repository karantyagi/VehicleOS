"use client";

import { useEffect, useState } from "react";
import { LOGIN_VALUE_CARDS } from "@/lib/login-value-cards";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5500;

export function LoginValueCards() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % LOGIN_VALUE_CARDS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  return (
    <figure
      className="relative mx-auto w-full max-w-[26rem] px-6 lg:px-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsPaused(false);
        }
      }}
    >
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        Why we built VehicleOS
      </p>

      <div
        className="mt-5 flex justify-center gap-1.5"
        role="tablist"
        aria-label="Value highlights"
      >
        {LOGIN_VALUE_CARDS.map((card, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={card.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={card.title}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                isActive ? "w-6 bg-primary" : "w-1.5 bg-primary/25 hover:bg-primary/40",
              )}
            />
          );
        })}
      </div>

      <div className="mt-4 space-y-1">
        {LOGIN_VALUE_CARDS.map((card, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={card.id}
              type="button"
              aria-expanded={isActive}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "w-full rounded-lg border text-left transition-all duration-300 ease-out",
                isActive
                  ? "border-primary/25 bg-primary/[0.06] px-4 py-3.5 shadow-sm"
                  : "border-transparent px-3 py-2 opacity-55 hover:opacity-90",
              )}
            >
              <span className="flex items-baseline gap-2.5">
                <span className="font-mono text-[10px] tabular-nums text-primary/80" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "font-medium tracking-tight text-foreground transition-all duration-300",
                    isActive ? "text-[15px]" : "text-[13px]",
                  )}
                >
                  {card.title}
                </span>
              </span>
              <p
                className={cn(
                  "overflow-hidden text-[13px] leading-relaxed text-muted-foreground transition-all duration-300",
                  isActive ? "mt-2 max-h-24 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                {card.body}
              </p>
            </button>
          );
        })}
      </div>

      <figcaption className="sr-only">Five reasons owners use VehicleOS</figcaption>
    </figure>
  );
}
