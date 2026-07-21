export const openEvidenceDocument = async (input: {
  apiBase: string;
  vehicleId: string;
  documentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  const response = await fetch(
    `${input.apiBase}/api/vehicles/${input.vehicleId}/evidence/${input.documentId}/url`,
  );
  const body = (await response.json()) as {
    available?: boolean;
    signedUrl?: string;
    reason?: string;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: body.error ?? "Could not open evidence" };
  }

  if (body.available && body.signedUrl) {
    window.open(body.signedUrl, "_blank", "noopener,noreferrer");
    return { ok: true };
  }

  return {
    ok: false,
    error: body.reason ?? "Evidence file is recorded but not available in this environment",
  };
};
