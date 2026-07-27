import type { VehicleRequestOpsPayload } from "./vehicle-request-types.js";

const MARKETING_URL = process.env.VEHICLEOS_MARKETING_URL?.trim() ?? "https://vehicleos.app";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const formatVehicleLabel = (payload: Pick<VehicleRequestOpsPayload, "year" | "make" | "model" | "trim">): string =>
  `${payload.year} ${payload.make} ${payload.model} ${payload.trim}`;

export const formatVehicleRequestOwnerConfirmationEmail = (
  payload: VehicleRequestOpsPayload,
): { subject: string; text: string; html: string } => {
  const vehicle = formatVehicleLabel(payload);
  const email = payload.contactEmail.trim();
  const subject = `Working on your request — ${vehicle}`;

  const text = [
    "Got it — we're prioritizing your car.",
    "",
    "You asked — we're on it.",
    "",
    vehicle,
    "",
    `We'll email ${email} when VehicleOS is ready for your car.`,
    "",
    "— VehicleOS",
  ].join("\n");

  const safeVehicle = escapeHtml(vehicle);
  const safeEmail = escapeHtml(email);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;color:#18181b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Got it — we're prioritizing your ${safeVehicle}. We'll email ${safeEmail} when VehicleOS is ready for your car.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;margin:0;padding:24px 20px;">
    <tr>
      <td align="left">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;">
          <tr>
            <td style="padding:32px 32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;text-align:left;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                <tr>
                  <td style="width:32px;height:32px;border-radius:8px;background-color:#22c55e;text-align:center;vertical-align:middle;">
                    <span style="font-size:16px;line-height:32px;color:#ffffff;">✓</span>
                  </td>
                  <td style="padding-left:10px;font-size:14px;font-weight:600;letter-spacing:-0.02em;color:#18181b;">VehicleOS</td>
                </tr>
              </table>
              <h1 style="margin:0 0 10px;font-size:24px;line-height:1.35;font-weight:600;letter-spacing:-0.02em;color:#18181b;text-align:left;">
                Got it — we're prioritizing your car.
              </h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#52525b;text-align:left;">
                You asked — we're on it.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #22c55e;border-radius:8px;">
                <tr>
                  <td style="padding:14px 16px;font-size:17px;line-height:1.4;font-weight:600;color:#14532d;text-align:left;">
                    ${safeVehicle}
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:16px;line-height:1.65;color:#3f3f46;text-align:left;">
                We'll email <a href="mailto:${safeEmail}" style="color:#16a34a;font-weight:600;text-decoration:none;">${safeEmail}</a> when VehicleOS is ready for your car.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;border-top:1px solid #f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;text-align:left;">
              <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#71717a;text-align:left;">
                <a href="${escapeHtml(MARKETING_URL)}" style="color:#71717a;text-decoration:underline;">vehicleos.app</a>
                · Your car's reminding assistant
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
};
