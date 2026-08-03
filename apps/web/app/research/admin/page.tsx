import { redirect } from "next/navigation";
import { ResearchCohortShell } from "../../../components/research-cohort-shell";
import { ResearchOperatorPage } from "../../../components/research-operator-page";
import { getResearchOperatorAccess } from "../../../lib/research-import/access";

export const dynamic = "force-dynamic";

export default async function ResearchAdminPage() {
  const access = await getResearchOperatorAccess();
  if (!access.ok) redirect("/");
  return (
    <ResearchCohortShell user={access.participant} operator mode="operator">
      <ResearchOperatorPage />
    </ResearchCohortShell>
  );
}
