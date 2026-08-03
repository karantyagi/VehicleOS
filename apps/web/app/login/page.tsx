import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { LoginValueSpotlight } from "@/components/login-value-spotlight";
import { ThemeSegmentedToggle } from "@/components/theme-segmented-toggle";
import { SignInButtons } from "../../components/sign-in-buttons";
import { LogoMark } from "../../lib/logo-mark";
import { siteConfig } from "../../lib/site-config";
import { isResearchCohortSurface } from "../../lib/research-import/policy";
import { isAuthEnabled } from "../../lib/supabase/env";

type LoginPageProps = {
  searchParams?: { error?: string; deleted?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  const researchSurface = isResearchCohortSurface();
  const hasError = searchParams?.error === "auth";
  const wasDeleted = searchParams?.deleted === "1";

  return (
    <main className="login-page min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,28.5rem)_1fr] xl:grid-cols-[minmax(0,31rem)_1fr]">
      <section className="login-page__panel relative flex min-h-screen flex-col border-b border-primary/10 bg-gradient-to-b from-primary/[0.05] via-background to-background px-8 py-6 sm:px-10 lg:border-b-0 lg:border-r lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 no-underline">
            <LogoMark className="logo-mark logo-mark--login" />
            <span className="text-base font-semibold tracking-tight text-foreground">
              Vehicle<span className="text-primary">OS</span>
            </span>
          </Link>
          <ThemeSegmentedToggle className="lg:hidden" />
        </header>

        <div className="flex flex-1 flex-col justify-center py-10 sm:py-14">
          <div className="mx-auto w-full max-w-[22rem] space-y-8">
            <div className="space-y-1">
              <p className="text-sm font-medium text-primary">{researchSurface ? "Invite-only research" : "Free early access"}</p>
              <h1 className="text-balance leading-[1.08] tracking-tight">
                <span className="block text-[2.75rem] font-semibold text-primary sm:text-5xl">Sign in</span>
                <span className="mt-1 block text-xl font-medium text-foreground sm:text-2xl">
                  {researchSurface ? "to CARFAX import research" : "to your maintenance assistant"}
                </span>
              </h1>
            </div>

            {wasDeleted ? <Alert className="text-sm">Your account was deleted. Sign in to start fresh.</Alert> : null}
            {hasError ? (
              <Alert variant="destructive" className="text-sm">
                Sign-in didn&apos;t complete. Try again.
              </Alert>
            ) : null}

            <SignInButtons />

            {researchSurface ? (
              <p className="text-center text-sm leading-6 text-muted-foreground">Use the Google account Karan invited to this research pilot.</p>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                New here?{" "}
                <Link
                  href={siteConfig.marketingUrl}
                  className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Learn more
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </p>
            )}
          </div>
        </div>

        <footer className="pb-1 pt-4 text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
          By continuing, you agree to our{" "}
          <Link
            href={siteConfig.legal.terms}
            className="text-foreground/80 underline-offset-4 hover:text-primary hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href={siteConfig.legal.privacy}
            className="text-foreground/80 underline-offset-4 hover:text-primary hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </footer>
      </section>

      <section className="login-page__brand relative hidden min-h-screen flex-col overflow-hidden bg-gradient-to-br from-primary/[0.1] via-background to-background lg:flex dark:from-primary/[0.16]">
        <div className="absolute right-6 top-6 z-10 flex items-center gap-2.5 xl:right-8 xl:top-8">
          <Link
            href={siteConfig.marketingUrl}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-background"
          >
            Learn more
            <ArrowUpRight className="h-3.5 w-3.5 text-primary" aria-hidden />
          </Link>
          <ThemeSegmentedToggle />
        </div>

        <div className="flex flex-1 items-start justify-center px-10 pb-12 pt-[clamp(3.5rem,12vh,6.5rem)] xl:px-16">
          {researchSurface ? (
            <div className="w-full max-w-xl rounded-2xl border border-primary/15 bg-background/55 p-8 shadow-sm backdrop-blur-sm">
              <p className="text-sm font-medium text-primary">CARFAX import research</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Help us make import trustworthy.</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">Upload a CARFAX PDF, check the draft, and correct anything that is wrong. This research never changes your VehicleOS maintenance history.</p>
            </div>
          ) : <LoginValueSpotlight />}
        </div>
      </section>

      <section className="border-t border-primary/10 bg-primary/[0.03] px-6 py-12 lg:hidden">
        {researchSurface ? (
          <div className="mx-auto max-w-xl">
            <p className="text-sm font-medium text-primary">CARFAX import research</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Check an AI-assisted draft to help improve PDF import. Nothing here changes your maintenance history.</p>
          </div>
        ) : <LoginValueSpotlight />}
      </section>
    </main>
  );
}
