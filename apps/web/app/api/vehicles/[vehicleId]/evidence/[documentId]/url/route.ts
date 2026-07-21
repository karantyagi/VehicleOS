import { NextResponse } from "next/server";
import { getEvidenceAccessUrl } from "@vehicleos/server";
import { toAuthContext } from "../../../../../../../lib/auth/api-context";
import { getSessionUser } from "../../../../../../../lib/auth/session";
import { getServices } from "../../../../../../../lib/api-services";
import { createReceiptSignedUrl } from "../../../../../../../lib/receipt-storage";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string; documentId: string } };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const result = await getEvidenceAccessUrl(
    getServices(),
    context.params.vehicleId,
    context.params.documentId,
    toAuthContext(user),
    {
      createSignedUrl: async ({ storageKey }) => createReceiptSignedUrl(storageKey),
    },
  );
  return NextResponse.json(result.body, { status: result.status });
}
