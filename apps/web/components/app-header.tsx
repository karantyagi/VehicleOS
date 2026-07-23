import Link from "next/link";
import type { SessionUser } from "../lib/auth/types";
import { siteConfig } from "../lib/site-config";
import { LogoMark } from "../lib/logo-mark";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  user: SessionUser | null;
  placement?: "sidebar" | "mobile";
};

function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground no-underline hover:opacity-90",
        className,
      )}
    >
      <LogoMark />
      <span>{siteConfig.name}</span>
    </Link>
  );
}

export function AppHeader({ user, placement = "sidebar" }: AppHeaderProps) {
  if (placement === "mobile") {
    return (
      <div className="flex min-w-0 items-center">
        <BrandLink className="min-w-0 truncate" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <BrandLink />
      {!user ? (
        <Link className="text-xs text-muted-foreground hover:text-foreground" href={`${siteConfig.marketingUrl}/#demo`}>
          Watch demo
        </Link>
      ) : null}
    </div>
  );
}
