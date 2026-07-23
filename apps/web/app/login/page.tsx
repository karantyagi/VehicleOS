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
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,32rem)_1fr] xl:grid-cols-[minmax(0,36rem)_1fr]">
      {/* Left — sign-in */}
      <section className="relative flex min-h-screen flex-col border-b border-border px-6 py-6 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 xl:px-16">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2.5 no-underline">
            <LogoMark />
            <span className="text-base font-semibold tracking-tight text-foreground">Vehicle OS</span>
          </Link>
          <ThemeSegmentedToggle className="lg:hidden" />
        </header>

        <div className="flex flex-1 flex-col justify-center py-10 sm:py-14">
          <div className="mx-auto w-full max-w-[22rem] space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground">Sign in to your account</p>
            </div>

            {wasDeleted ? <Alert className="text-sm">Your account was deleted. Sign in to start fresh.</Alert> : null}
            {hasError ? (
              <Alert variant="destructive" className="text-sm">
                Sign-in didn&apos;t complete. Try again.
              </Alert>
            ) : null}

            <SignInButtons />

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have access?{" "}
              <Link
                href={siteConfig.marketingUrl}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Request early access
              </Link>
            </p>
          </div>
        </div>

        <footer className="pb-2 pt-6 text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
          By continuing, you agree to our{" "}
          <Link href={`${siteConfig.marketingUrl}/terms`} className="underline-offset-4 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href={`${siteConfig.marketingUrl}/privacy`} className="underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </footer>
      </section>

      {/* Right — brand panel (static team quote until real user reviews) */}
      <section className="relative hidden min-h-screen flex-col bg-background lg:flex">
        <div className="absolute right-6 top-6 z-10 flex items-center gap-3 xl:right-10 xl:top-8">
          <Link
            href={siteConfig.marketingUrl}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60"
          >
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
            Learn more
          </Link>
          <ThemeSegmentedToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-10 xl:px-16">
          <LoginTestimonial />
        </div>
      </section>

      {/* Mobile — compact testimonial */}
      <section className="border-t border-border bg-muted/30 px-6 py-10 lg:hidden">
        <LoginTestimonial />
      </section>
    </main>
  );
}
