import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newTripSchema } from "@/lib/schemas";
import { todaySast } from "@/lib/format";
import { badRequest, dbErrorResponse, registerDriver } from "@/lib/list-errors";

/** Start a list. Runs as the signed-in user, so the database rules (RLS) decide what is allowed. */
export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const parsed = newTripSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const v = parsed.data;
  const supabase = await createClient();

  // Marshals always start today's list; the office may enter a list for another day.
  const tripDate = profile.role === "admin" ? v.trip_date : todaySast();

  // "later": the driver is not here yet. The list is saved without one and the driver is set before closing.
  let driverId: string | null = v.driver_id === "later" ? null : v.driver_id;
  if (driverId === "new") {
    const registered = await registerDriver(supabase, v);
    if ("response" in registered) return registered.response;
    driverId = registered.id;
  }

  let vehicleId = v.vehicle_id;
  if (vehicleId === "new") {
    const { data, error } = await supabase
      .from("vehicles")
      .insert({ registration_no: v.registration_no, owner_title: v.owner_title, owner_name: v.owner_name, default_driver_id: driverId, created_by: profile.id })
      .select("id")
      .single();
    if (error?.code === "23505") {
      return NextResponse.json({ error: `${v.registration_no} is already registered. Pick it from the list.` }, { status: 409 });
    }
    if (error) return dbErrorResponse(error, "The vehicle could not be saved.");
    vehicleId = data.id;
  }

  const { data: trip, error } = await supabase
    .from("trips")
    .insert({ trip_date: tripDate, vehicle_id: vehicleId, driver_id: driverId, route_id: v.route_id })
    .select("id")
    .single();
  if (error) return dbErrorResponse(error, "The list could not be started.");
  return NextResponse.json({ ok: true, id: trip.id });
}
