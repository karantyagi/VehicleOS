import { AppHeader } from "../components/app-header";
import { OwnerDashboard } from "../components/owner-dashboard";
import { getSessionUser } from "../lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <main className="shell golden-path">
      <AppHeader user={user} />
      <OwnerDashboard />
    </main>
  );
}
