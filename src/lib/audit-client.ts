/** Fire-and-forget audit event from client-side auth forms — never blocks or fails the auth
 * flow itself; a dropped audit write is not a reason to stop someone signing in. */
export function recordAuthEvent(action: "auth.login" | "auth.signup" | "auth.password_reset_requested" | "auth.logout", email?: string) {
  fetch("/api/audit/auth-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, email }),
  }).catch(() => {});
}
