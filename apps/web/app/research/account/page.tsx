import { redirect } from "next/navigation";
import { ResearchAccountPage } from "../../../components/research-account-page";
import { ResearchCohortShell } from "../../../components/research-cohort-shell";
import { getSessionUser } from "../../../lib/auth/session";
import { isResearchCohortSurface, isResearchOperatorAllowed } from "../../../lib/research-import/policy";

export const dynamic = "force-dynamic";

export default async function ResearchAccountRoute() {
  if (!isResearchCohortSurface()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fresearch%2Faccount");
  const operator = isResearchOperatorAllowed(user);

  return (
    <ResearchCohortShell user={user} operator={operator} mode={operator ? "operator" : "participant"}>
      <ResearchAccountPage email={user.email ?? "Research account"} operator={operator} />
    </ResearchCohortShell>
  );
}
