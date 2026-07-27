export type VehicleRequestOpsPayload = {
  requestId: string;
  createdAt: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  note?: string;
  contactEmail: string;
  source?: string;
  userId?: string;
};

export const formatVehicleRequestOpsEmail = (
  payload: VehicleRequestOpsPayload,
): { subject: string; text: string } => {
  const vehicle = `${payload.year} ${payload.make} ${payload.model} ${payload.trim}`;
  const subject = `VehicleOS request: ${vehicle}`;

  const lines = [
    "New vehicle catalog request",
    "",
    `Request ID: ${payload.requestId}`,
    `Vehicle: ${vehicle}`,
    `Reply to owner: ${payload.contactEmail}`,
    `Source: ${payload.source ?? "app"}`,
    `Submitted: ${payload.createdAt}`,
  ];

  if (payload.userId) lines.push(`User ID: ${payload.userId}`);
  if (payload.note) {
    lines.push("", "Note:", payload.note);
  }

  lines.push("", "— VehicleOS vehicle request");

  return { subject, text: lines.join("\n") };
};

export const formatVehicleRequestOwnerConfirmationEmail = (
  payload: VehicleRequestOpsPayload,
): { subject: string; text: string } => {
  const vehicle = `${payload.year} ${payload.make} ${payload.model} ${payload.trim}`;
  const subject = `We received your VehicleOS request — ${vehicle}`;

  const lines = [
    "Hi,",
    "",
    `Thanks for requesting ${vehicle} for VehicleOS early access.`,
    "",
    "We add verified OEM maintenance schedules in batches. When your trim is ready to set up, we'll email you again with a link to sign in and pick your car from the catalog.",
    "",
    `Request ID: ${payload.requestId}`,
    "",
    "— VehicleOS",
    "https://vehicleos.app",
  ];

  return { subject, text: lines.join("\n") };
};

const postResendEmail = async (input: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<void> => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      reply_to: input.replyTo,
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${body}`);
  }
};

const resolveRequestFromEmail = (): string =>
  process.env.VEHICLEOS_REQUEST_FROM_EMAIL?.trim() ?? "VehicleOS <onboarding@resend.dev>";

export const sendVehicleRequestOpsEmail = async (payload: VehicleRequestOpsPayload): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const opsEmail = process.env.VEHICLEOS_OPS_EMAIL?.trim();

  if (!apiKey || !opsEmail) {
    console.warn(
      "[vehicle-request] ops email skipped — set RESEND_API_KEY and VEHICLEOS_OPS_EMAIL on Vercel",
    );
    return;
  }

  const { subject, text } = formatVehicleRequestOpsEmail(payload);

  await postResendEmail({
    apiKey,
    from: resolveRequestFromEmail(),
    to: [opsEmail],
    replyTo: payload.contactEmail,
    subject,
    text,
  });
};

/** Instant acknowledgment to the owner — requires a verified sending domain for non-ops recipients. */
export const sendVehicleRequestOwnerConfirmationEmail = async (
  payload: VehicleRequestOpsPayload,
): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const fromEmail = resolveRequestFromEmail();
  if (fromEmail.includes("@resend.dev")) {
    console.warn(
      "[vehicle-request] owner confirmation skipped — verify vehicleos.app in Resend and set VEHICLEOS_REQUEST_FROM_EMAIL",
    );
    return;
  }

  const { subject, text } = formatVehicleRequestOwnerConfirmationEmail(payload);

  await postResendEmail({
    apiKey,
    from: fromEmail,
    to: [payload.contactEmail],
    replyTo: process.env.VEHICLEOS_OPS_EMAIL?.trim() || undefined,
    subject,
    text,
  });
};

export const notifyVehicleRequest = async (payload: VehicleRequestOpsPayload): Promise<void> => {
  try {
    await sendVehicleRequestOpsEmail(payload);
  } catch (error) {
    console.error("[vehicle-request] ops email failed", error);
  }

  try {
    await sendVehicleRequestOwnerConfirmationEmail(payload);
  } catch (error) {
    console.error("[vehicle-request] owner confirmation failed", error);
  }
};
