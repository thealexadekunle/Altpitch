/** Falls back to localhost in dev so sitemap/robots/JSON-LD absolute URLs still resolve without
 * NEXT_PUBLIC_SITE_URL set locally — update the env var, not this default, once a custom domain
 * is attached. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Reserved feature_flags.key an admin creates via the generic /admin/flags UI (no dedicated
 * "maintenance mode" admin page needed) — toggling enabled_globally on this flag is what
 * MaintenanceGate in app-shell.tsx reacts to. */
export const MAINTENANCE_FLAG_KEY = "maintenance_mode";
