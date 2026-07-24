"use client";

import { useCallback, useEffect, useState } from "react";
import { LOGIN_CAROUSEL_MS, LOGIN_VALUE_CARDS } from "@/lib/login-value-cards";
import { cn } from "@/lib/utils";

/** CSS transition on `.login-carousel__ring` — keep in sync with globals.css */
export const LOGIN_CAROUSEL_TRANSITION_MS = 700;

type CarouselSlideProps = {
  card: (typeof LOGIN_VALUE_CARDS)[number];
  showTagline: boolean;
  titleClassName?: string;
  taglineClassName?: string;
};

function CarouselSlide({ card, showTagline, titleClassName, taglineClassName }: CarouselSlideProps) {
  return (
    <>
      <p className={titleClassName}>{card.title}</p>
      <p
        className={cn(
          "text-base text-muted-foreground transition-all duration-300 lg:text-lg",
          showTagline ? "mt-2 max-h-16 opacity-100" : "mt-0 max-h-0 overflow-hidden opacity-0",
          taglineClassName,
        )}
        aria-hidden={!showTagline}
      >
        {card.tagline}
      </p>
    </>
  );
}

export function LoginValueCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isEngaged, setIsEngaged] = useState(false);
  const [timerEpoch, setTimerEpoch] = useState(0);

  const cardCount = LOGIN_VALUE_CARDS.length;
  const sliceAngle = 360 / cardCount;
  const activeCard = LOGIN_VALUE_CARDS[activeIndex];

  const goToIndex = useCallback(
    (index: number) => {
      setIsEngaged(true);
      setActiveIndex((index + cardCount) % cardCount);
      setTimerEpoch((epoch) => epoch + 1);
    },
    [cardCount],
  );

  const goNext = useCallback(() => goToIndex(activeIndex + 1), [activeIndex, goToIndex]);
  const goPrev = useCallback(() => goToIndex(activeIndex - 1), [activeIndex, goToIndex]);

  useEffect(() => {
    if (isEngaged) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % cardCount);
    }, LOGIN_CAROUSEL_MS);
    return () => window.clearInterval(timer);
  }, [cardCount, isEngaged, timerEpoch]);

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
      setIsEngaged(false);
    }
  };

  return (
    <figure
      className="login-carousel relative mx-auto w-full max-w-[32rem] px-4 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsEngaged(true)}
      onMouseLeave={() => setIsEngaged(false)}
      onFocus={() => setIsEngaged(true)}
      onBlur={handleBlur}
      aria-label="Why VehicleOS — use arrow keys to browse"
    >
      <div className="login-carousel__glow pointer-events-none" aria-hidden />

      <p className="sr-only" aria-live="polite">
        {activeCard.title}
        {isEngaged ? `. ${activeCard.tagline}` : ""}
      </p>

      {/* Desktop — 3D ring */}
      <div className="login-carousel__scene hidden sm:block" aria-hidden>
        <div
          className="login-carousel__ring"
          style={{ transform: `rotateY(${-activeIndex * sliceAngle}deg)` }}
        >
          {LOGIN_VALUE_CARDS.map((card, index) => (
            <div
              key={card.id}
              className={cn(
                "login-carousel__face",
                index === activeIndex && "login-carousel__face--active",
                isEngaged && index === activeIndex && "login-carousel__face--engaged",
              )}
              style={{ transform: `rotateY(${index * sliceAngle}deg) translateZ(11.5rem)` }}
            >
              <CarouselSlide
                card={card}
                showTagline={isEngaged && index === activeIndex}
                titleClassName="text-xl font-semibold tracking-tight text-foreground lg:text-2xl"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile — single fade (no 3D) */}
      <div className="relative min-h-[5.5rem] sm:hidden sm:min-h-0" aria-hidden>
        {LOGIN_VALUE_CARDS.map((card, index) => (
          <div
            key={card.id}
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-500",
              index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <CarouselSlide
              card={card}
              showTagline={isEngaged && index === activeIndex}
              titleClassName="text-xl font-semibold tracking-tight text-foreground"
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Highlights">
        {LOGIN_VALUE_CARDS.map((card, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={card.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${card.title}. ${card.tagline}`}
              onClick={() => goToIndex(index)}
              className={cn(
                "rounded-full transition-all duration-300",
                isActive ? "h-2 w-8 bg-primary" : "h-2 w-2 bg-primary/25 hover:bg-primary/45",
              )}
            />
          );
        })}
      </div>

      <figcaption className="sr-only">
        Rotating value highlights for VehicleOS. Hover or use arrow keys to read detail.
      </figcaption>
    </figure>
  );
}
