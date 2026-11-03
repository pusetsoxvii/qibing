import { redirect } from "next/navigation";
import { homeFor, requireProfile } from "@/lib/auth";
import { SecretForm } from "@/components/secret-form";

export const dynamic = "force-dynamic";

export default async function ChangePinPage() {
  const profile = await requireProfile({ allowPinChange: true });
  if (!profile.must_change_pin) redirect(homeFor(profile.role));
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4 py-10">
      <h1 className="text-2xl">Choose your own PIN</h1>
      <p>Hello {profile.full_name}. You signed in with a temporary PIN. Choose a new one that only you know before you continue.</p>
      <SecretForm role={profile.role} forced />
      <form action="/api/auth/sign-out" method="post">
        <button className="min-h-12 w-full font-semibold text-brand-dark underline">Log out</button>
      </form>
    </main>
  );
}
