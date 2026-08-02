import { AppHeader } from "../components/app-header";
import { AppShell } from "../components/app-shell";
import { OwnerDashboard } from "../components/owner-dashboard";
import { ResearchCohortPage } from "../components/research-cohort-page";
import { getSessionUser } from "../lib/auth/session";
import { isResearchCohortSurface, isResearchParticipantAllowed } from "../lib/research-import/policy";
import { VehicleConsoleProvider } from "../lib/vehicle-console-context";

export default async function HomePage() {
  const user = await getSessionUser();

  if (isResearchCohortSurface()) {
    return <ResearchCohortPage email={user?.email ?? null} invited={isResearchParticipantAllowed(user)} />;
  }

  return (
    <VehicleConsoleProvider>
      <AppShell
        user={user}
        sidebarHeader={<AppHeader user={user} placement="sidebar" />}
        mobileBar={<AppHeader user={user} placement="mobile" />}
      >
        <OwnerDashboard />
      </AppShell>
    </VehicleConsoleProvider>
  );
}
