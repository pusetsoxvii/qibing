import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function MarshalDashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect("/admin");
  return <AppShell profile={profile}>{children}</AppShell>;
}
