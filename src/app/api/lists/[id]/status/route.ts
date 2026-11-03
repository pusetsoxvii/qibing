import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reopenSchema } from "@/lib/schemas";
import { badRequest, dbErrorResponse } from "@/lib/list-errors";

/** Close a list (marshal or office) or reopen a closed one (office only, with a reason). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const supabase = await createClient();

  if (body.action === "close") {
    const { error } = await supabase.rpc("close_trip", { p_trip_id: id });
    if (error) return dbErrorResponse(error, "The list could not be closed.");
    return NextResponse.json({ ok: true });
  }
  if (body.action === "reopen") {
    if (profile.role !== "admin") return NextResponse.json({ error: "Only the office (admin) can reopen a list." }, { status: 403 });
    const parsed = reopenSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues);
    const { error } = await supabase.rpc("reopen_trip", { p_trip_id: id, p_reason: parsed.data.reason });
    if (error) return dbErrorResponse(error, "The list could not be reopened.");
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
