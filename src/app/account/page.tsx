import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { SecretForm } from "@/components/secret-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await requireProfile();
  const label = profile.role === "admin" ? "password" : "PIN";
  return (
    <AppShell profile={profile}>
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <h1 className="text-2xl">My Account</h1>
        <Card>
          <p><strong>Name:</strong> {profile.full_name}</p>
          <p><strong>Username:</strong> {profile.username}</p>
          <p><strong>Role:</strong> {profile.role === "admin" ? "Admin (office)" : "Queue Marshal"}</p>
        </Card>
        <h2 className="text-lg">Change {label}</h2>
        <SecretForm role={profile.role} />
        <form action="/api/auth/sign-out" method="post">
          <button className="min-h-12 w-full rounded-lg border-2 border-brand font-semibold text-brand-dark">Log out</button>
        </form>
      </div>
    </AppShell>
  );
}
