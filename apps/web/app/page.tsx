import { AppHeader } from "../components/app-header";
import { AppShell } from "../components/app-shell";
import { OwnerDashboard } from "../components/owner-dashboard";
import { getSessionUser } from "../lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <AppShell
      user={user}
      sidebarHeader={<AppHeader user={user} placement="sidebar" />}
      mobileBar={<AppHeader user={user} placement="mobile" />}
    >
      <OwnerDashboard />
    </AppShell>
  );
}
