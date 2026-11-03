import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { pinSchema } from "@/lib/schemas";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("deactivate") }),
  z.object({ action: z.literal("reactivate") }),
  z.object({ action: z.literal("unlock") }),
  z.object({ action: z.literal("reset_pin"), pin: pinSchema }),
]);

// Ban length used to block a deactivated account at the Auth level (about 100 years).
const BAN_FOREVER = "876000h";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getProfile();
  if (!actor || !actor.active || actor.role !== "admin") {
    return NextResponse.json({ error: "Only the office (admin) can do this." }, { status: 403 });
  }
  const parsed = actionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  if (id === actor.id && parsed.data.action === "deactivate") {
    return NextResponse.json({ error: "You can't deactivate your own account." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id, role").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const fail = (msg: string) => NextResponse.json({ error: msg }, { status: 500 });

  switch (parsed.data.action) {
    case "deactivate": {
      const { error } = await admin.rpc("admin_update_profile", { p_actor: actor.id, p_id: id, p_active: false, p_action: "deactivate" });
      if (error) return fail(error.message);
      // Blocks token refresh on every device; RLS already denies data to inactive profiles.
      await admin.auth.admin.updateUserById(id, { ban_duration: BAN_FOREVER });
      break;
    }
    case "reactivate": {
      const { error } = await admin.rpc("admin_update_profile", { p_actor: actor.id, p_id: id, p_active: true, p_unlock: true, p_action: "reactivate" });
      if (error) return fail(error.message);
      await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
      break;
    }
    case "unlock": {
      const { error } = await admin.rpc("admin_update_profile", { p_actor: actor.id, p_id: id, p_unlock: true, p_action: "unlock" });
      if (error) return fail(error.message);
      break;
    }
    case "reset_pin": {
      if (target.role !== "marshal") return NextResponse.json({ error: "Only marshal PINs can be reset here." }, { status: 400 });
      const updated = await admin.auth.admin.updateUserById(id, { password: parsed.data.pin });
      if (updated.error) return NextResponse.json({ error: "The PIN was refused: " + updated.error.message }, { status: 400 });
      const { error } = await admin.rpc("admin_update_profile", { p_actor: actor.id, p_id: id, p_must_change_pin: false, p_unlock: true, p_action: "reset_pin" });
      if (error) return fail(error.message);
      break;
    }
  }
  return NextResponse.json({ ok: true });
}
