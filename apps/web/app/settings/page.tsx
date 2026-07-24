import { redirect } from "next/navigation";
import { SettingsWorkspace } from "../../components/settings-workspace";
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
      <SettingsWorkspace user={user} />
    </AppShell>
  );
}
