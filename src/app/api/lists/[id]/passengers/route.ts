import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tripPassengerSchema } from "@/lib/schemas";
import { badRequest, dbErrorResponse } from "@/lib/list-errors";

/** Add a passenger to a list, registering them in the passenger directory if they are new. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await params;
  const profile = await getProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const parsed = tripPassengerSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const p = parsed.data;
  const supabase = await createClient();

  // A retried save (e.g. after a dropped signal) finds its own row and stops here.
  const { data: already } = await supabase.from("trip_passengers").select("id").eq("id", p.id).maybeSingle();
  if (already) return NextResponse.json({ ok: true });

  let passengerId = p.passenger_id;
  if (!passengerId) {
    const { data: known } = await supabase
      .from("passengers")
      .select("id")
      .ilike("full_name", p.full_name.replace(/[\\%_]/g, (c) => "\\" + c))
      .eq("next_of_kin_no", p.next_of_kin_no)
      .limit(1)
      .maybeSingle();
    if (known) {
      passengerId = known.id;
    } else {
      const { data, error } = await supabase
        .from("passengers")
        .insert({
          full_name: p.full_name, next_of_kin_no: p.next_of_kin_no,
          last_from_address: p.from_address, last_destination_address: p.destination_address, created_by: profile.id,
        })
        .select("id")
        .single();
      if (error) return dbErrorResponse(error, "The passenger could not be registered.");
      passengerId = data.id;
    }
  }

  const { data: last } = await supabase
    .from("trip_passengers")
    .select("seat_order")
    .eq("trip_id", tripId)
    .eq("is_child", p.is_child)
    .order("seat_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("trip_passengers").insert({
    id: p.id, trip_id: tripId, passenger_id: passengerId,
    full_name: p.full_name, from_address: p.from_address, destination_address: p.destination_address,
    next_of_kin_no: p.next_of_kin_no, paid_cents: p.paid, is_child: p.is_child,
    seat_order: (last?.seat_order ?? 0) + 1, created_by: profile.id,
  });
  if (error) return dbErrorResponse(error, "The passenger could not be added.");
  return NextResponse.json({ ok: true });
}
