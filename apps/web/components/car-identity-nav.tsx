"use client";

import { CarFront, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CAR_IDENTITY_GROUP_LABEL, CAR_IDENTITY_NAV, type CarIdentityTab } from "@/lib/car-identity-nav";
import { cn } from "@/lib/utils";

const TAB_ICONS: Record<CarIdentityTab, typeof CarFront> = {
  car: CarFront,
  driver: UserRound,
};

type CarIdentityNavProps = {
  onNavigate?: () => void;
  className?: string;
};

function CarIdentityNavContent({ onNavigate, className }: CarIdentityNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isGarageRoute = pathname === "/garage";
  const activeTab: CarIdentityTab = searchParams.get("tab") === "driver" ? "driver" : "car";

  return (
    <nav className={cn("flex flex-col gap-0.5 px-2", className)} aria-label={CAR_IDENTITY_GROUP_LABEL}>
      <p className="px-3 pb-2 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {CAR_IDENTITY_GROUP_LABEL}
      </p>
      {CAR_IDENTITY_NAV.map((item) => {
        const Icon = TAB_ICONS[item.id];
        const isActive = isGarageRoute && activeTab === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-[background-color,box-shadow,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-[0_1px_2px_hsl(158_64%_20%/0.2)]"
                : "text-sidebar-foreground hover:bg-sidebar-accent/70",
            )}
            title={item.description}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="font-medium leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function CarIdentityNav(props: CarIdentityNavProps) {
  return (
    <Suspense fallback={null}>
      <CarIdentityNavContent {...props} />
    </Suspense>
  );
}
