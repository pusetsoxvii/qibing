import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorResponse } from "@/lib/list-errors";

/** Take a passenger off a draft list. They stay in the passenger directory. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id: tripId, pid } = await params;
  const profile = await getProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("trip_passengers").delete().eq("id", pid).eq("trip_id", tripId).select("id");
  if (error) return dbErrorResponse(error, "The passenger could not be removed.");
  if (!data?.length) return NextResponse.json({ error: "That passenger is not on this list, or the list is closed." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
