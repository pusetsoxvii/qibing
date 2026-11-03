import { NextResponse } from "next/server";
import { getProfile, usernameToEmail } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMarshalSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const actor = await getProfile();
  if (!actor || !actor.active || actor.role !== "admin") {
    return NextResponse.json({ error: "Only the office (admin) can do this." }, { status: 403 });
  }
  const parsed = createMarshalSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }
  const { full_name, username, pin } = parsed.data;
  const admin = createAdminClient();

  const { data: existing } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (existing) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });

  const created = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password: pin,
    email_confirm: true,
    user_metadata: { username },
  });
  if (created.error || !created.data.user) {
    return NextResponse.json({ error: "The account could not be created: " + (created.error?.message ?? "") }, { status: 400 });
  }

  const { error } = await admin.rpc("admin_create_profile", {
    p_actor: actor.id, p_id: created.data.user.id, p_full_name: full_name, p_username: username, p_role: "marshal",
  });
  if (error) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return NextResponse.json({ error: "The account could not be saved: " + error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
