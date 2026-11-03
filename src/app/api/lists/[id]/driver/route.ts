import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setDriverSchema } from "@/lib/schemas";
import { badRequest, dbErrorResponse, registerDriver } from "@/lib/list-errors";

/** Set (or change) the driver on a draft list, e.g. once the driver arrives. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const parsed = setDriverSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const supabase = await createClient();

  let driverId = parsed.data.driver_id;
  if (driverId === "new") {
    const registered = await registerDriver(supabase, parsed.data);
    if ("response" in registered) return registered.response;
    driverId = registered.id;
  }

  const { data, error } = await supabase.from("trips").update({ driver_id: driverId }).eq("id", id).select("id");
  if (error) return dbErrorResponse(error, "The driver could not be set.");
  if (!data?.length) return NextResponse.json({ error: "That list could not be found, or it is closed." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
