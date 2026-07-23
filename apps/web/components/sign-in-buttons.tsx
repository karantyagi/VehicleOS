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
    <div className="flex flex-col gap-2 pt-1">
      <Button type="button" className="w-full" onClick={() => void signIn("google")}>
        Google
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={() => void signIn("github")}>
        GitHub
      </Button>
    </div>
  );
}
