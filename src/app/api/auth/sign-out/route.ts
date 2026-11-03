import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SIGNIN_COOKIE } from "@/lib/env";

async function signOut(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await createAdminClient().rpc("log_event", {
      p_actor: data.user.id, p_action: "sign_out", p_entity: "profiles", p_entity_id: data.user.id,
    });
  }
  await supabase.auth.signOut();
  const reason = new URL(request.url).searchParams.get("reason");
  const url = new URL("/login", request.url);
  if (reason === "deactivated" || reason === "expired") url.searchParams.set("reason", reason);
  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.delete(SIGNIN_COOKIE);
  return response;
}

export const GET = signOut;
export const POST = signOut;
