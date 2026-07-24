"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LOGIN_SPOTLIGHT_MS, LOGIN_VALUE_CARDS } from "@/lib/login-value-cards";
import { cn } from "@/lib/utils";

export function LoginValueSpotlight() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timerEpoch, setTimerEpoch] = useState(0);
  const [railDotTop, setRailDotTop] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const cardCount = LOGIN_VALUE_CARDS.length;

  const goToIndex = useCallback(
    (index: number) => {
      setActiveIndex((index + cardCount) % cardCount);
      setTimerEpoch((epoch) => epoch + 1);
    },
    [cardCount],
  );

  const goNext = useCallback(() => goToIndex(activeIndex + 1), [activeIndex, goToIndex]);
  const goPrev = useCallback(() => goToIndex(activeIndex - 1), [activeIndex, goToIndex]);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % cardCount);
    }, LOGIN_SPOTLIGHT_MS);
    return () => window.clearInterval(timer);
  }, [cardCount, isPaused, timerEpoch]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const row = rowRefs.current[activeIndex];
    if (!list || !row) return;

    const updateRailDot = () => {
      const activeRow = rowRefs.current[activeIndex];
      if (!list || !activeRow) return;
      const listRect = list.getBoundingClientRect();
      const rowRect = activeRow.getBoundingClientRect();
      setRailDotTop(rowRect.top - listRect.top + rowRect.height / 2);
    };

    updateRailDot();

    const observer = new ResizeObserver(updateRailDot);
    observer.observe(list);
    rowRefs.current.forEach((entry) => {
      if (entry) observer.observe(entry);
    });

    return () => observer.disconnect();
  }, [activeIndex]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsPaused(false);
    }
  };

  return (
    <figure
      className="login-spotlight relative mx-auto w-full max-w-[26rem] px-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30 focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:px-4 lg:max-w-[28rem]"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={handleBlur}
      aria-label="Why we built VehicleOS"
    >
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        Why we built VehicleOS
      </p>

      <div className="relative mt-8" ref={listRef}>
        <div
          className="login-spotlight__rail pointer-events-none absolute bottom-3 left-[0.6875rem] top-3 w-px bg-slate-200/70 dark:bg-slate-700/50"
          aria-hidden
        />
        <div
          className="login-spotlight__rail-dot pointer-events-none absolute left-3 z-[1] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400 dark:bg-slate-500"
          style={{ top: railDotTop }}
          aria-hidden
        />

        <div className="relative space-y-1 pl-8" role="list">
          {LOGIN_VALUE_CARDS.map((card, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={card.id}
                type="button"
                role="listitem"
                ref={(node) => {
                  rowRefs.current[index] = node;
                }}
                aria-expanded={isActive}
                onMouseEnter={() => goToIndex(index)}
                onFocus={() => goToIndex(index)}
                onClick={() => goToIndex(index)}
                className={cn(
                  "login-spotlight__row block w-full rounded-xl text-left transition-all duration-300 ease-out",
                  isActive
                    ? "login-spotlight__row--active px-4 py-3.5"
                    : "px-3 py-2.5 opacity-80 hover:opacity-100",
                )}
              >
                <span className="flex items-baseline gap-2.5">
                  <span
                    className="w-5 shrink-0 text-xs tabular-nums text-slate-400 dark:text-slate-500"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "font-medium tracking-tight transition-all duration-300 ease-out",
                      isActive
                        ? "text-xl text-slate-700 dark:text-slate-200"
                        : "text-base text-slate-400 dark:text-slate-500",
                    )}
                  >
                    {card.title}
                  </span>
                </span>
                <p
                  className={cn(
                    "overflow-hidden pl-[1.875rem] text-[15px] leading-relaxed text-slate-500 transition-all duration-300 ease-out dark:text-slate-400",
                    isActive ? "mt-2 max-h-16 opacity-100" : "max-h-0 opacity-0",
                  )}
                  aria-hidden={!isActive}
                >
                  {card.body}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <figcaption className="sr-only">
        Five reasons owners use VehicleOS. Arrow keys move the spotlight.
      </figcaption>
    </figure>
  );
}
