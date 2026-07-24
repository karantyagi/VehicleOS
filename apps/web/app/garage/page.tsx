import { redirect } from "next/navigation";
import { AppHeader } from "../../components/app-header";
import { AppShell } from "../../components/app-shell";
import { GarageWorkspace } from "../../components/garage-workspace";
import { getSessionUser } from "../../lib/auth/session";
import { isAuthEnabled } from "../../lib/supabase/env";

export default async function GaragePage() {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/garage");
  }

  return (
    <AppShell
      user={user}
      sidebarHeader={<AppHeader user={user} placement="sidebar" />}
      mobileBar={<AppHeader user={user} placement="mobile" />}
    >
      <GarageWorkspace />
    </AppShell>
  );
}
