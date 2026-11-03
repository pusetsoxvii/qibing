import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { homeFor, usernameToEmail, type Role } from "@/lib/auth";
import { signInSchema } from "@/lib/schemas";
import { minutesUntil } from "@/lib/format";
import { SESSION_HOURS, SIGNIN_COOKIE } from "@/lib/env";
import { t } from "@/lib/strings";

export async function POST(request: Request) {
  const parsed = signInSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: t.login.wrong }, { status: 400 });
  const { username, secret } = parsed.data;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, active, locked_until, must_change_pin")
    .eq("username", username)
    .maybeSingle();

  // Unknown usernames get the same message as a wrong PIN.
  if (!profile) return NextResponse.json({ error: t.login.wrong }, { status: 401 });
  if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
    return NextResponse.json({ error: t.login.locked(minutesUntil(profile.locked_until)) }, { status: 423 });
  }
  if (!profile.active) return NextResponse.json({ error: t.login.deactivated }, { status: 403 });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password: secret });

  if (error) {
    const { data: result } = await admin.rpc("record_sign_in", { p_profile_id: profile.id, p_success: false });
    const lockedUntil = Array.isArray(result) ? result[0]?.locked_until : null;
    if (lockedUntil) {
      return NextResponse.json({ error: t.login.locked(minutesUntil(lockedUntil)) }, { status: 423 });
    }
    return NextResponse.json({ error: t.login.wrong }, { status: 401 });
  }

  await admin.rpc("record_sign_in", { p_profile_id: profile.id, p_success: true });
  const response = NextResponse.json({
    redirect: profile.must_change_pin ? "/change-pin" : homeFor(profile.role as Role),
  });
  response.cookies.set(SIGNIN_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return response;
}
