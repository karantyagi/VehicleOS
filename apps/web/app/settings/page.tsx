import Link from "next/link";
import { redirect } from "next/navigation";
import { AppFooter } from "../../components/app-footer";
import { AppHeader } from "../../components/app-header";
import { DeleteAccountPanel } from "../../components/delete-account-panel";
import { getSessionUser } from "../../lib/auth/session";
import { isAuthEnabled } from "../../lib/supabase/env";

export default async function SettingsPage() {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  return (
    <main className="shell settings-shell">
      <AppHeader user={user} />
      <section className="hero">
        <p className="eyebrow">Account</p>
        <h1>Settings</h1>
        <p>Manage your early-access account and data rights.</p>
      </section>

      <section className="panel settings-panel">
        <h2>Signed in as</h2>
        <p>{user.email ?? user.id}</p>
        <Link className="header-link" href="/">
          Back to dashboard
        </Link>
      </section>

      <DeleteAccountPanel />
      <AppFooter />
    </main>
  );
}
