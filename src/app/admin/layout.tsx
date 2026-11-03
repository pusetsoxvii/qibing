import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile({ role: "admin" });
  return <AppShell profile={profile}>{children}</AppShell>;
}
