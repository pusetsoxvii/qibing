import { NextResponse } from "next/server";
import { getProfile, homeFor, usernameToEmail } from "@/lib/auth";
import { createAdminClient, createIsolatedAnonClient } from "@/lib/supabase/admin";
import { newSecretSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = newSecretSchema(profile.role).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }
  const label = profile.role === "admin" ? "password" : "PIN";

  // Verify the current secret without touching this browser's session.
  const verifier = createIsolatedAnonClient();
  const check = await verifier.auth.signInWithPassword({
    email: usernameToEmail(profile.username),
    password: parsed.data.current,
  });
  if (check.error) return NextResponse.json({ error: `Your current ${label} is not correct.` }, { status: 400 });
  await verifier.auth.signOut({ scope: "local" });

  const admin = createAdminClient();
  const updated = await admin.auth.admin.updateUserById(profile.id, { password: parsed.data.next });
  if (updated.error) {
    return NextResponse.json({ error: `The new ${label} was refused: ${updated.error.message}` }, { status: 400 });
  }
  await admin.rpc("admin_update_profile", {
    p_actor: profile.id, p_id: profile.id, p_must_change_pin: false, p_action: "change_own_secret",
  });
  return NextResponse.json({ ok: true, redirect: homeFor(profile.role) });
}
