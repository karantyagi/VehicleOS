import { AppHeader } from "../components/app-header";
import { AppShell } from "../components/app-shell";
import { OwnerDashboard } from "../components/owner-dashboard";
import { ResearchCohortPage } from "../components/research-cohort-page";
import { ResearchCohortShell } from "../components/research-cohort-shell";
import { getSessionUser } from "../lib/auth/session";
import { isResearchCohortSurface, isResearchOperatorAllowed, isResearchParticipantAllowed } from "../lib/research-import/policy";
import { VehicleConsoleProvider } from "../lib/vehicle-console-context";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();

  if (isResearchCohortSurface()) {
    return (
      <ResearchCohortShell user={user} operator={isResearchOperatorAllowed(user)}>
        <ResearchCohortPage
          email={user?.email ?? null}
          invited={isResearchParticipantAllowed(user)}
        />
      </ResearchCohortShell>
    );
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
