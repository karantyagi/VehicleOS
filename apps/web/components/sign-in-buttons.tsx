"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { GitHubLogoMark, GoogleLogoMark } from "./oauth-provider-icons";
import { cn } from "@/lib/utils";

type Provider = "google" | "github";

const LAST_PROVIDER_KEY = "vehicleos:last-auth-provider";

type SignInButtonsProps = {
  className?: string;
};

function LastUsedBadge() {
  return (
    <span className="absolute -right-0.5 -top-2.5 z-10 rounded-full bg-[hsl(158_64%_22%)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white shadow-sm dark:bg-[hsl(158_55%_38%)] dark:text-[hsl(160_30%_8%)]">
      Last used
    </span>
  );
}

export function SignInButtons({ className }: SignInButtonsProps) {
  const [lastUsed, setLastUsed] = useState<Provider | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_PROVIDER_KEY);
    if (stored === "google" || stored === "github") {
      setLastUsed(stored);
    }
  }, []);

  const signIn = async (provider: Provider) => {
    localStorage.setItem(LAST_PROVIDER_KEY, provider);
    setLastUsed(provider);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        {lastUsed === "google" ? <LastUsedBadge /> : null}
        {/* Google Identity Services — light neutral button (branding guidelines). */}
        <button
          type="button"
          onClick={() => void signIn("google")}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#747775] bg-white px-4 text-sm font-medium text-[#1f1f1f] shadow-sm transition-[box-shadow,background-color] hover:bg-[#f8f9fa] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1a1a1b]"
        >
          <GoogleLogoMark className="shrink-0" />
          <span>Sign in with Google</span>
        </button>
      </div>

      <div className="relative">
        {lastUsed === "github" ? <LastUsedBadge /> : null}
        {/* GitHub — dark mark on near-black button (github.com/logos). */}
        <button
          type="button"
          onClick={() => void signIn("github")}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#24292f] bg-[#24292f] px-4 text-sm font-medium text-white shadow-sm transition-[background-color,box-shadow] hover:bg-[#1b1f23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <GitHubLogoMark className="shrink-0 text-white" />
          <span>Sign in with GitHub</span>
        </button>
      </div>

      <p className="pt-1 text-center text-xs leading-relaxed text-muted-foreground">
        You&apos;ll finish sign-in on Google or GitHub — we never see your password.
      </p>
    </div>
  );
}
