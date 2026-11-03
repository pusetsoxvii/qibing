import { redirect } from "next/navigation";
import { getBranding, logoUrl } from "@/lib/branding";
import { getProfile, homeFor } from "@/lib/auth";
import { t } from "@/lib/strings";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const branding = await getBranding();
  if (!branding.setup_complete) redirect("/setup");
  const profile = await getProfile();
  if (profile?.active) redirect(homeFor(profile.role));

  const { reason } = await searchParams;
  const notice = reason === "expired" ? t.login.expired : reason === "deactivated" ? t.login.deactivated : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        {branding.logo_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl(branding.logo_path)} alt="Association logo" className="h-28 w-28 object-contain" />
        )}
        <h1 className="text-2xl">{branding.association_name}</h1>
      </div>
      <LoginForm notice={notice} />
    </main>
  );
}
