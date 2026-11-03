import { redirect } from "next/navigation";
import { getBranding } from "@/lib/branding";
import { getProfile, homeFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const branding = await getBranding();
  if (!branding.setup_complete) redirect("/setup");
  const profile = await getProfile();
  if (!profile) redirect("/login");
  redirect(homeFor(profile.role));
}
