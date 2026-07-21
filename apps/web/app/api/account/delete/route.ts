import { NextResponse } from "next/server";
import { deleteUserData, getPool } from "@vehicleos/server";
import { getSessionUser } from "../../../../lib/auth/session";
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

  try {
    await deleteUserData(getPool(), user.id);

    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) {
      console.error("Supabase auth delete failed", authError);
      return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
    }

    const supabase = createClient();
    await supabase.auth.signOut();

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Account deletion failed", error);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
