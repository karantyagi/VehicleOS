"use client";

import { createClient } from "../lib/supabase/client";
import { GitHubLogoMark, GoogleLogoMark } from "./oauth-provider-icons";
import { cn } from "@/lib/utils";

type Provider = "google" | "github";

type SignInButtonsProps = {
  className?: string;
};

export function SignInButtons({ className }: SignInButtonsProps) {
  const signIn = async (provider: Provider) => {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      {/* Google Identity Services — light neutral button (branding guidelines). */}
      <button
        type="button"
        onClick={() => void signIn("google")}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-[#747775] bg-white px-3 text-[13px] font-medium text-[#1f1f1f] shadow-sm transition-[box-shadow,background-color] hover:bg-[#f8f9fa] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1a1a1b]"
      >
        <GoogleLogoMark className="shrink-0" />
        <span>Sign in with Google</span>
      </button>

      {/* GitHub — dark mark on near-black button (github.com/logos). */}
      <button
        type="button"
        onClick={() => void signIn("github")}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-[#24292f] bg-[#24292f] px-3 text-[13px] font-medium text-white shadow-sm transition-[background-color,box-shadow] hover:bg-[#1b1f23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <GitHubLogoMark className="shrink-0 text-white" />
        <span>Sign in with GitHub</span>
      </button>

      <p className="pt-0.5 text-center text-[11px] leading-relaxed text-muted-foreground">
        You&apos;ll finish sign-in on Google or GitHub — we never see your password.
      </p>
    </div>
  );
}
