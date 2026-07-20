import { redirect } from "next/navigation";
import { SignInButtons } from "../../components/sign-in-buttons";
import { LogoMark } from "../../lib/logo-mark";
import { siteConfig } from "../../lib/site-config";
import { isAuthEnabled } from "../../lib/supabase/env";

type LoginPageProps = {
  searchParams?: { error?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  const hasError = searchParams?.error === "auth";

  return (
    <main className="shell login-shell">
      <section className="login-panel">
        <a className="logo" href={siteConfig.marketingUrl}>
          <LogoMark />
          {siteConfig.name}
        </a>
        <p className="eyebrow">Owners · Early access</p>
        <h1>Sign in to your garage</h1>
        <p>
          Use Google or GitHub — free during early access. Your vehicles and service history stay
          private to your account.
        </p>
        {hasError ? (
          <p className="login-error">Sign-in failed. Try again or use a different provider.</p>
        ) : null}
        <SignInButtons />
      </section>
    </main>
  );
}
