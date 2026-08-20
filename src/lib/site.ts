/** Falls back to localhost in dev so sitemap/robots/JSON-LD absolute URLs still resolve without
 * NEXT_PUBLIC_SITE_URL set locally — update the env var, not this default, once a custom domain
 * is attached. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
