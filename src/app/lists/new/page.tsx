import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { todaySast } from "@/lib/format";
import { NewListForm, type Option } from "./new-list-form";

export default async function NewListPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [routes, vehicles, drivers] = await Promise.all([
    supabase.from("routes").select("id, name, is_default").eq("active", true).order("name"),
    supabase.from("vehicles").select("id, registration_no, owner_title, owner_name, default_driver_id").eq("active", true).order("registration_no"),
    supabase.from("drivers_directory").select("id, full_name, id_or_licence_no").eq("active", true).order("full_name"),
  ]);

  const routeOptions: Option[] = (routes.data ?? []).map((r) => ({ id: r.id, label: r.name }));
  const vehicleOptions: (Option & { driverId: string | null })[] = (vehicles.data ?? []).map((v) => ({
    id: v.id,
    label: `${v.registration_no} · ${v.owner_title === "none" ? "" : v.owner_title + " "}${v.owner_name}`,
    driverId: v.default_driver_id,
  }));
  const driverOptions: Option[] = (drivers.data ?? []).map((d) => ({ id: d.id, label: `${d.full_name} (${d.id_or_licence_no})` }));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <Link href="/lists" className="text-brand underline">← Today&apos;s Lists</Link>
        <h1 className="mt-2 text-2xl">Start a new list</h1>
      </div>
      <NewListForm
        canPickDate={profile.role === "admin"}
        today={todaySast()}
        routes={routeOptions}
        defaultRouteId={(routes.data ?? []).find((r) => r.is_default)?.id ?? routeOptions[0]?.id ?? ""}
        vehicles={vehicleOptions}
        drivers={driverOptions}
        loadError={!!(routes.error || vehicles.error || drivers.error)}
      />
    </div>
  );
}
