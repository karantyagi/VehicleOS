import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeSegmentedToggle } from "@/components/theme-segmented-toggle";
import { SignInButtons } from "../../components/sign-in-buttons";
import { LogoMark } from "../../lib/logo-mark";
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
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeSegmentedToggle />
      </div>
      <Card className="w-full max-w-sm border-border/80 shadow-lg">
        <CardContent className="space-y-6 px-6 pb-8 pt-8">
          <div className="space-y-4 text-center">
            <Link href="/" className="mx-auto flex flex-col items-center gap-3 no-underline">
              <LogoMark />
              <span className="text-xl font-semibold tracking-tight text-foreground">Vehicle OS</span>
            </Link>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
              <p className="text-pretty text-sm text-muted-foreground">Your Personal Car Maintenance Assistant</p>
            </div>
          </div>

          {wasDeleted ? <Alert className="text-sm">Your account was deleted. Sign in to start fresh.</Alert> : null}
          {hasError ? (
            <Alert variant="destructive" className="text-sm">
              Sign-in didn&apos;t complete. Try again.
            </Alert>
          ) : null}

          <SignInButtons />
        </CardContent>
      </Card>
    </main>
  );
}
