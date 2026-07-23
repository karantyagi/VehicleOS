import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { AssistantDiaryMark } from "@/components/assistant-diary-mark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ThemeSegmentedToggle } from "@/components/theme-segmented-toggle";
import { SignInButtons } from "../../components/sign-in-buttons";
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
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeSegmentedToggle />
      </div>
      <Card className="w-full max-w-sm border-border/80 shadow-lg">
        <CardHeader className="space-y-4 pb-2 text-center">
          <AssistantDiaryMark size="md" className="mx-auto justify-center" />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Sign in to continue</h1>
            <p className="text-pretty text-sm text-muted-foreground">Google or GitHub — your garage stays on your account.</p>
          </div>
          <Link
            href={siteConfig.marketingUrl}
            className="inline-block text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {siteConfig.name} · what we build
          </Link>
        </CardHeader>
        <CardContent className="space-y-3 pb-8">
          {wasDeleted ? <Alert className="text-sm">Account deleted. Sign in again to start fresh.</Alert> : null}
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
