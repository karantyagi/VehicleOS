import { NextResponse } from "next/server";
import { extractRecordImportPdf } from "@vehicleos/server";
import { toAuthContext } from "../../../../../../lib/auth/api-context";
import { getSessionUser } from "../../../../../../lib/auth/session";
import { getServices } from "../../../../../../lib/api-services";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string } };

const MAX_IMPORT_PDF_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const formData = await request.formData();
  const file = formData.get("file");
  const categoryRaw = formData.get("category");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const category = categoryRaw === "rmv" ? "rmv" : categoryRaw === "carfax" ? "carfax" : null;
  if (!category) {
    return NextResponse.json({ error: 'category must be "carfax" or "rmv"' }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "file is empty" }, { status: 400 });
  }
  if (file.size > MAX_IMPORT_PDF_BYTES) {
    return NextResponse.json({ error: "PDF exceeds 15 MB limit" }, { status: 413 });
  }

  const contentType = file.type || "application/octet-stream";
  if (contentType !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Upload a PDF file." }, { status: 415 });
  }

  const pdfBuffer = Buffer.from(await file.arrayBuffer());
  const result = await extractRecordImportPdf(
    getServices(),
    context.params.vehicleId,
    { category, pdfBuffer, fileName: file.name },
    toAuthContext(user),
  );

  return NextResponse.json(result.body, { status: result.status });
}
