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

export const sendVehicleRequestOpsEmail = async (payload: VehicleRequestOpsPayload): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const opsEmail = process.env.VEHICLEOS_OPS_EMAIL?.trim();
  const fromEmail =
    process.env.VEHICLEOS_REQUEST_FROM_EMAIL?.trim() ?? "VehicleOS <onboarding@resend.dev>";

  if (!apiKey || !opsEmail) {
    console.warn(
      "[vehicle-request] ops email skipped — set RESEND_API_KEY and VEHICLEOS_OPS_EMAIL on Vercel",
    );
    return;
  }

  const { subject, text } = formatVehicleRequestOpsEmail(payload);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [opsEmail],
      reply_to: payload.contactEmail,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend ops email failed (${response.status}): ${body}`);
  }
};
