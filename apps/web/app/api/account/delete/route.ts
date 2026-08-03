import { NextResponse } from "next/server";
import { deleteUserData, getPool } from "@vehicleos/server";
import { getSessionUser } from "../../../../lib/auth/session";
import { isResearchCohortSurface } from "../../../../lib/research-import/policy";
import { deleteResearchParticipantData } from "../../../../lib/research-import/repository";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { isAuthEnabled } from "../../../../lib/supabase/env";

export const runtime = "nodejs";

type DeleteAccountBody = {
  confirm?: string;
};

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Account deletion requires auth" }, { status: 501 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: DeleteAccountBody;
  try {
    body = (await request.json()) as DeleteAccountBody;
  } catch {
    return NextResponse.json({ error: "confirm must be DELETE" }, { status: 400 });
  }

  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: "confirm must be DELETE" }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Account deletion blocked: SUPABASE_SERVICE_ROLE_KEY is not set");
    return NextResponse.json(
      { error: "Account deletion is not configured on this server. Contact support." },
      { status: 503 },
    );
  }

  try {
    if (isResearchCohortSurface()) {
      await deleteResearchParticipantData(user.id);
    } else {
      await deleteUserData(getPool(), user.id);
    }

    const supabase = createClient();
    await supabase.auth.signOut();

    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) {
      console.error("Supabase auth delete failed", authError);
      return NextResponse.json(
        { error: authError.message.includes("service_role") ? "Server misconfigured for deletion" : "Deletion failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Account deletion failed", error);
    const message = error instanceof Error ? error.message : "Deletion failed";
    const isMisconfigured = message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      { error: isMisconfigured ? "Account deletion is not configured on this server. Contact support." : "Deletion failed" },
      { status: isMisconfigured ? 503 : 500 },
    );
  }
}
