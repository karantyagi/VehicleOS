export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function readJsonResponseOrThrow<T extends { error?: string }>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const body = await readJsonResponse<T>(response);

  if (!response.ok) {
    throw new Error(body?.error ?? fallbackMessage);
  }

  return (body ?? {}) as T;
}
