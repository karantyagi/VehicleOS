import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountPanel } from "../../components/delete-account-panel";
import { PageHeader } from "../../components/page-header";
import { PanelCard } from "../../components/panel-card";
import { AppHeader } from "../../components/app-header";
import { AppShell } from "../../components/app-shell";
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
    <AppShell
      user={user}
      sidebarHeader={<AppHeader user={user} placement="sidebar" />}
      mobileBar={<AppHeader user={user} placement="mobile" />}
    >
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your early-access account and data rights."
      />

      <PanelCard title="Signed in as" description="Your early-access identity for VehicleOS.">
        <p className="text-sm font-medium">{user.email ?? user.id}</p>
        <Link className="text-sm text-primary hover:underline" href="/">
          Back to dashboard
        </Link>
      </PanelCard>

      <DeleteAccountPanel />
    </AppShell>
  );
}
