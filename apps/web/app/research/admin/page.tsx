import { redirect } from "next/navigation";
import { ResearchOperatorPage } from "../../../components/research-operator-page";
import { getResearchOperatorAccess } from "../../../lib/research-import/access";

export const dynamic = "force-dynamic";

export default async function ResearchAdminPage() {
  const access = await getResearchOperatorAccess();
  if (!access.ok) redirect("/");
  return <ResearchOperatorPage email={access.participant.email} />;
}
