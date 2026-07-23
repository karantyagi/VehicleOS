import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle variant="icon" />
      </div>
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center">
          <Link href={siteConfig.marketingUrl} className="mx-auto mb-2 flex items-center justify-center gap-2 no-underline">
            <LogoMark />
            <span className="font-semibold text-foreground">{siteConfig.name}</span>
          </Link>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Owners · Early access</p>
          <CardTitle>Sign in to your garage</CardTitle>
          <CardDescription>
            Use Google or GitHub — free during early access. Your vehicles and service history stay private to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {wasDeleted ? <Alert>Your account and vehicle data were deleted.</Alert> : null}
          {hasError ? <Alert variant="destructive">Sign-in failed. Try again or use a different provider.</Alert> : null}
          <SignInButtons />
        </CardContent>
      </Card>
    </main>
  );
}
