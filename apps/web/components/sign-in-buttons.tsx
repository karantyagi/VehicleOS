"use client";

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
    <div className="sign-in-actions">
      <button type="button" className="sign-in-button" onClick={() => signIn("google")}>
        Continue with Google
      </button>
      <button type="button" className="sign-in-button secondary" onClick={() => signIn("github")}>
        Continue with GitHub
      </button>
    </div>
  );
}
