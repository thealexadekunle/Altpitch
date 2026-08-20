/** Shared error handling for service-layer fetches — a designed message, not a raw error dump.
 * Routes that return JSON bodies get their `error` field; routes that still return plain text
 * (validation failures, etc.) fall back to reading the body as text. */
export async function throwForFailedResponse(res: Response, fallback: string): Promise<never> {
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}) as { retryAfterSeconds?: number });
    const seconds = body.retryAfterSeconds ?? 60;
    throw new Error(`Too many requests — try again in ${seconds}s.`);
  }
  if (res.status === 402) {
    // Both exhaustion modes route to the same upgrade modal; the modal reads the live balance
    // to decide whether it offers a subscription or a top-up.
    throw new Error("credits_exhausted");
  }

  const raw = await res.text().catch(() => "");
  let message = raw || fallback;
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed.error) message = parsed.error;
  } catch {
    // not JSON — `raw` (or the fallback) is already the message
  }
  throw new Error(message);
}
