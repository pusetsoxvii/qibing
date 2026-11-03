import { getBranding } from "@/lib/branding";
import { SETUP_DEFAULTS } from "@/lib/setup-defaults";
import { LinkButton } from "@/components/ui";
import { SetupWizard } from "./setup-wizard";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const branding = await getBranding();
  if (branding.setup_complete) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4 text-center">
        <h1 className="text-2xl">Setup is already complete</h1>
        <p>This app has been set up. Sign in with your username and PIN or password.</p>
        <LinkButton href="/login">Go to sign in</LinkButton>
      </main>
    );
  }
  return <SetupWizard defaults={SETUP_DEFAULTS} />;
}
