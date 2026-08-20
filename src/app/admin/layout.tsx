import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAdmin, NotAdminError } from "@/lib/admin/require-admin";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin(headers());
  } catch (err) {
    if (err instanceof NotAdminError) {
      redirect(err.status === 401 ? "/login?next=%2Fadmin" : "/dashboard");
    }
    throw err;
  }

  return <AdminShell>{children}</AdminShell>;
}
