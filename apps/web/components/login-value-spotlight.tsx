"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LOGIN_SPOTLIGHT_MS, LOGIN_VALUE_CARDS } from "@/lib/login-value-cards";
import { cn } from "@/lib/utils";

/** Locks list height so the eyebrow header never shifts when rows expand. */
const LIST_MIN_HEIGHT = "24rem";

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
      className="login-spotlight login-spotlight--refined relative mx-auto flex w-full max-w-[30rem] flex-col px-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:px-4 lg:max-w-[32rem]"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={handleBlur}
      aria-label="VehicleOS owner benefits"
    >
      <header className="login-spotlight__header mb-8 flex shrink-0 items-center justify-between gap-4 pl-1 sm:pl-2">
        <div className="flex min-w-0 items-stretch gap-3">
          <span className="login-spotlight__eyebrow-accent h-10 w-0.5 shrink-0 rounded-full" aria-hidden />
          <div className="min-w-0 pt-0.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Care, without the clutter
            </p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight text-primary sm:text-xl">VehicleOS</p>
          </div>
        </div>
        <span className="login-spotlight__status shrink-0">
          <span className="login-spotlight__status-dot" aria-hidden />
          Calm by default
        </span>
      </header>

      <div className="login-spotlight__stage relative shrink-0" ref={listRef} style={{ minHeight: LIST_MIN_HEIGHT }}>
        <div
          className="login-spotlight__rail pointer-events-none absolute bottom-3 left-5 top-3 w-px"
          aria-hidden
        />
        <div
          className="login-spotlight__rail-dot pointer-events-none absolute left-5 z-[1] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ top: railDotTop }}
          aria-hidden
        />

        <div className="relative space-y-1 px-1 py-1 pl-10" role="list">
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
                  "login-spotlight__row block w-full rounded-2xl px-4 py-3.5 text-left sm:px-5",
                  isActive ? "login-spotlight__row--active" : "login-spotlight__row--idle",
                )}
              >
                <span
                  className={cn(
                    "login-spotlight__title flex min-h-[2rem] items-center font-medium tracking-tight sm:min-h-[2.25rem]",
                    isActive
                      ? "login-spotlight__title--active text-[1.65rem] text-slate-700 dark:text-slate-100 sm:text-[1.8rem]"
                      : "login-spotlight__title--idle text-[1.05rem] text-slate-400 dark:text-slate-500 sm:text-lg",
                  )}
                >
                  {card.title}
                </span>
                <div
                  className={cn(
                    "login-spotlight__body grid transition-[grid-template-rows,opacity,margin] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                    isActive ? "mt-2 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
                  )}
                  aria-hidden={!isActive}
                >
                  <div className="overflow-hidden">
                    <p className="text-[15px] leading-6 text-slate-500 dark:text-slate-400 sm:text-base">{card.body}</p>
                  </div>
                </div>
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
