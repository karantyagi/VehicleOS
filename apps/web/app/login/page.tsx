import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { LoginTestimonial } from "@/components/login-testimonial";
import { ThemeSegmentedToggle } from "@/components/theme-segmented-toggle";
import { SignInButtons } from "../../components/sign-in-buttons";
import { LogoMark } from "../../lib/logo-mark";
import { siteConfig } from "../../lib/site-config";
import { isAuthEnabled } from "../../lib/supabase/env";

type LoginPageProps = {
  searchParams?: { error?: string; deleted?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  const hasError = searchParams?.error === "auth";
  const wasDeleted = searchParams?.deleted === "1";

  return (
    <main className="login-page min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,24rem)_1fr] xl:grid-cols-[minmax(0,26rem)_1fr]">
      {/* Left — sign-in (narrow column) */}
      <section className="login-page__panel relative flex min-h-screen flex-col border-b border-primary/15 bg-gradient-to-b from-primary/[0.04] via-background to-background px-6 py-6 sm:px-8 lg:border-b-0 lg:border-r lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 no-underline">
            <LogoMark className="logo-mark logo-mark--login" />
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              Vehicle<span className="text-primary">OS</span>
            </span>
          </Link>
          <ThemeSegmentedToggle className="lg:hidden" />
        </header>

        <div className="flex flex-1 flex-col justify-center py-10 sm:py-12">
          <div className="mx-auto w-full max-w-[17.5rem] space-y-7">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Owner app</p>
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-foreground">
                Welcome back
              </h1>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Sign in to your car maintenance assistant
              </p>
            </div>

            {wasDeleted ? <Alert className="text-sm">Your account was deleted. Sign in to start fresh.</Alert> : null}
            {hasError ? (
              <Alert variant="destructive" className="text-sm">
                Sign-in didn&apos;t complete. Try again.
              </Alert>
            ) : null}

            <SignInButtons />

            <p className="text-center text-[13px] text-muted-foreground">
              Don&apos;t have access?{" "}
              <Link
                href={siteConfig.marketingUrl}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Request early access
              </Link>
            </p>
          </div>
        </div>

        <footer className="pb-1 pt-4 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-left">
          By continuing, you agree to our{" "}
          <Link
            href={siteConfig.legal.terms}
            className="text-foreground/80 underline-offset-4 hover:text-primary hover:underline"
          >
            Terms of Service
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

      {/* Right — brand panel */}
      <section className="login-page__brand relative hidden min-h-screen flex-col bg-gradient-to-br from-primary/[0.07] via-background to-background lg:flex dark:from-primary/[0.12]">
        <div className="absolute right-5 top-5 z-10 flex items-center gap-2.5 xl:right-8 xl:top-7">
          <Link
            href={siteConfig.marketingUrl}
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-border/80 bg-background/80 px-3 text-[13px] font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/25 hover:bg-background"
          >
            <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
            Learn more
          </Link>
          <ThemeSegmentedToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-8 xl:px-14">
          <LoginTestimonial />
        </div>
      </section>

      {/* Mobile — compact testimonial */}
      <section className="border-t border-primary/10 bg-primary/[0.04] px-6 py-10 lg:hidden">
        <LoginTestimonial />
      </section>
    </main>
  );
}
