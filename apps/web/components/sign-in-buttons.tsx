"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "../lib/supabase/client";

type Provider = "google" | "github";

export function SignInButtons() {
  const signIn = async (provider: Provider) => {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" className="h-11 w-full text-sm font-medium" onClick={() => void signIn("google")}>
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full text-sm font-medium"
        onClick={() => void signIn("github")}
      >
        Continue with GitHub
      </Button>
    </div>
  );
}
