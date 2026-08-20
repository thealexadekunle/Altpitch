import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAdminRole, NotAdminError } from "@/lib/admin/require-admin";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Role-only gate here (not the full requireAdmin), so a not-yet-2FA-enrolled admin can still
// reach /admin/security to enroll — AdminShell renders the enroll-to-continue block on every
// other admin page. Every actual data route still enforces 2FA via requireAdmin()/withAdmin().
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let twoFactorEnabled = false;
  try {
    const { session } = await requireAdminRole(headers());
    twoFactorEnabled = Boolean(session.user.twoFactorEnabled);
  } catch (err) {
    if (err instanceof NotAdminError) {
      redirect(err.status === 401 ? "/login?next=%2Fadmin" : "/dashboard");
    }
    throw err;
  }

  return <AdminShell twoFactorEnabled={twoFactorEnabled}>{children}</AdminShell>;
}
