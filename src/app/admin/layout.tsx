import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireAdminRole, NotAdminError } from "@/lib/admin/require-admin";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Role-only gate here (not the full requireAdmin), so a not-yet-2FA-enrolled admin can still
// reach /admin/security to enroll — AdminShell renders the enroll-to-continue block on every
// other admin page. Every actual data route still enforces 2FA via requireAdmin()/withAdmin().
//
// Anyone who isn't an admin — logged out, logged in as a regular user, doesn't matter — gets
// Next's real 404 page here via notFound(), not a redirect to /login. A redirect to /login is
// itself a signal ("there's something here that needs auth"); §0/DoD is explicit that a
// non-admin must not be able to tell this route exists at all.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let twoFactorEnabled = false;
  try {
    const { session } = await requireAdminRole(headers());
    twoFactorEnabled = Boolean(session.user.twoFactorEnabled);
  } catch (err) {
    if (err instanceof NotAdminError) {
      notFound();
    }
    throw err;
  }

  return <AdminShell twoFactorEnabled={twoFactorEnabled}>{children}</AdminShell>;
}
