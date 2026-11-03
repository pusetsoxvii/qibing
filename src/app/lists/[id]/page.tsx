import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui";
import { ListEditor, type ListPassenger } from "./list-editor";
import { DriverSetter } from "./driver-setter";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TripRow {
  id: string; trip_date: string; status: "draft" | "closed"; marshal_name: string;
  vehicles: { registration_no: string; owner_title: string; owner_name: string } | null;
  driver_id: string | null;
  routes: { name: string } | null;
  trip_passengers: ListPassenger[];
}

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: trip }, { data: settings }] = await Promise.all([
    supabase
      .from("trips")
      .select("id, trip_date, status, marshal_name, vehicles(registration_no, owner_title, owner_name), driver_id, routes(name), trip_passengers(id, full_name, from_address, destination_address, next_of_kin_no, paid_cents, is_child, seat_order)")
      .eq("id", id)
      .maybeSingle<TripRow>(),
    supabase.from("association_settings").select("child_limit").maybeSingle(),
  ]);
  if (!trip) notFound();

  // Drivers are read through drivers_directory: marshals may not read the drivers table itself.
  const needsDriver = trip.status === "draft" && !trip.driver_id;
  const { data: drivers } = needsDriver
    ? await supabase.from("drivers_directory").select("id, full_name, id_or_licence_no").eq("active", true).order("full_name")
    : await supabase.from("drivers_directory").select("id, full_name, id_or_licence_no").eq("id", trip.driver_id as string);
  const driverName = trip.driver_id ? drivers?.find((d) => d.id === trip.driver_id)?.full_name : undefined;

  const passengers = [...trip.trip_passengers].sort((a, b) => a.seat_order - b.seat_order);
  const owner = trip.vehicles ? `${trip.vehicles.owner_title === "none" ? "" : trip.vehicles.owner_title + " "}${trip.vehicles.owner_name}` : "";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <Link href="/lists" className="text-brand underline">← Today&apos;s Lists</Link>
        <div className="mt-2 flex items-start justify-between gap-2">
          <h1 className="text-2xl">{trip.vehicles?.registration_no}</h1>
          <Badge tone={trip.status}>{trip.status === "draft" ? "Draft" : "Closed"}</Badge>
        </div>
        <p className="text-gray-700">{trip.routes?.name} · {formatDate(trip.trip_date)}</p>
        <p className="text-gray-700">Owner {owner} · Driver {driverName ?? "not set yet"} · Marshal {trip.marshal_name}</p>
      </div>
      {needsDriver && (
        <DriverSetter tripId={trip.id} drivers={(drivers ?? []).map((d) => ({ id: d.id, label: `${d.full_name} (${d.id_or_licence_no})` }))} />
      )}
      <ListEditor
        tripId={trip.id}
        closed={trip.status === "closed"}
        hasDriver={!!trip.driver_id}
        isAdmin={profile.role === "admin"}
        passengers={passengers}
        childLimit={settings?.child_limit ?? 3}
      />
    </div>
  );
}
