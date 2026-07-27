export type CaptureIntent =
  | "maintenance_record"
  | "ownership_renewal"
  | "owner_preference"
  | "unknown";

export type ClassifyCaptureIntentInput = {
  filename?: string | null;
  mimeType?: string | null;
  channel?: "receipt_upload" | "photo" | "voice" | "manual" | null;
  hintText?: string | null;
};

export type ClassifyCaptureIntentResult = {
  intent: CaptureIntent;
  confidence: number;
  route: "maintenance" | "ownership" | "preferences" | "review";
  reason: string;
};

export const classifyCaptureIntent = (
  input: ClassifyCaptureIntentInput,
): ClassifyCaptureIntentResult => {
  const name = `${input.filename ?? ""} ${input.hintText ?? ""}`.toLowerCase();
  const mime = (input.mimeType ?? "").toLowerCase();

  if (/registration|rmv|dmv|renewal|inspection sticker|title|plate|excise|decal/.test(name)) {
    return {
      intent: "ownership_renewal",
      confidence: 0.9,
      route: "ownership",
      reason: "Looks like a registration or RMV/DMV document — route to Ownership import.",
    };
  }

  if (/techron|fuel system|preferences|settings|garage|parking permit|insurance card/.test(name)) {
    return {
      intent: "owner_preference",
      confidence: 0.82,
      route: "preferences",
      reason: "Looks like an owner preference or non-service document — not a maintenance receipt.",
    };
  }

  if (
    input.channel === "photo" ||
    input.channel === "receipt_upload" ||
    /receipt|invoice|service|oil|brake|tire|dealer|jiffy|valvoline/.test(name) ||
    mime.startsWith("image/")
  ) {
    return {
      intent: "maintenance_record",
      confidence: input.channel === "photo" ? 0.78 : 0.85,
      route: "maintenance",
      reason: "Treat as a maintenance receipt or service record.",
    };
  }

  return {
    intent: "unknown",
    confidence: 0.45,
    route: "review",
    reason: "Could not classify — owner review required.",
  };
};
