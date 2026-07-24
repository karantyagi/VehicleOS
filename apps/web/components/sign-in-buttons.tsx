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
    <div className={cn("mx-auto flex w-full max-w-[15.5rem] flex-col items-center gap-2.5", className)}>
      <button
        type="button"
        onClick={() => void signIn("google")}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#747775] bg-white px-4 text-sm font-medium text-[#1f1f1f] shadow-sm transition-[box-shadow,background-color,transform] hover:bg-[#f8f9fa] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1a1a1b]"
      >
        <GoogleLogoMark className="shrink-0" />
        <span>Continue with Google</span>
      </button>

      <button
        type="button"
        onClick={() => void signIn("github")}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#24292f] bg-[#24292f] px-4 text-sm font-medium text-white shadow-sm transition-[background-color,box-shadow,transform] hover:bg-[#1b1f23] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <GitHubLogoMark className="shrink-0 text-white" />
        <span>Continue with GitHub</span>
      </button>
    </div>
  );
}
