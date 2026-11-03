import "server-only";
import { createClient } from "@/lib/supabase/server";
import { logoUrl } from "@/lib/branding";
import type { PrintList, PrintPassenger, PrintSettings, PrintTrip } from "@/lib/print-types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const SETTINGS_COLUMNS =
  "short_name, street_address, town, postal_code, cell_no, email, registration_no, chairperson_line, secretary_line, show_list_reference, paper_size, logo_path, watermark_path";

async function liveContext(supabase: Supabase) {
  const [{ data: s, error }, { data: committee }] = await Promise.all([
    supabase.from("association_settings").select(SETTINGS_COLUMNS).maybeSingle(),
    supabase.from("committee_members").select("role_title, name").order("sort_order"),
  ]);
  if (error || !s) throw new Error("SETTINGS_UNAVAILABLE");
  const { logo_path, watermark_path, ...settings } = s as PrintSettings & { logo_path: string; watermark_path: string | null };
  return {
    settings: settings as PrintSettings,
    logoUrl: logoUrl(logo_path),
    watermarkUrl: logoUrl(watermark_path ?? logo_path),
    committee: committee ?? [],
  };
}

export async function loadBlankForms(count: number): Promise<PrintList[]> {
  const supabase = await createClient();
  const ctx = await liveContext(supabase);
  return Array.from({ length: count }, () => ({ ...ctx, trip: null, adults: [], children: [], isDraft: false }));
}

interface SnapshotPassenger extends PrintPassenger { is_child: boolean }
interface Snapshot {
  settings: PrintSettings & { logo_path: string; watermark_path?: string | null };
  committee: { role_title: string; name: string }[];
  trip: PrintTrip;
  passengers: SnapshotPassenger[];
}

interface TripRow {
  id: string;
  trip_date: string;
  status: "draft" | "closed";
  marshal_name: string;
  print_snapshot: Snapshot | null;
  vehicles: { registration_no: string; owner_title: PrintTrip["owner_title"]; owner_name: string } | null;
  driver_id: string | null;
  routes: { name: string } | null;
  trip_passengers: (SnapshotPassenger & { seat_order: number })[];
}

/** Loads lists in the order given. Lists the user may not see are left out (RLS). */
export async function loadTrips(ids: string[]): Promise<PrintList[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, trip_date, status, marshal_name, print_snapshot, vehicles(registration_no, owner_title, owner_name), driver_id, routes(name), trip_passengers(full_name, from_address, destination_address, next_of_kin_no, paid_cents, is_child, seat_order)",
    )
    .in("id", ids)
    .returns<TripRow[]>();
  if (error) throw new Error("TRIPS_UNAVAILABLE");
  const byId = new Map((data ?? []).map((r) => [r.id, r]));
  const needsLive = (data ?? []).some((r) => r.status === "draft" || !r.print_snapshot);
  const live = needsLive ? await liveContext(supabase) : null;
  // Driver names come from drivers_directory: marshals may not read the drivers table itself.
  const driverIds = [...new Set((data ?? []).map((r) => r.driver_id).filter((x): x is string => !!x))];
  const { data: drivers } = driverIds.length
    ? await supabase.from("drivers_directory").select("id, full_name").in("id", driverIds)
    : { data: [] };
  const driverName = new Map((drivers ?? []).map((d) => [d.id as string, d.full_name as string]));

  const lists: PrintList[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    if (row.status === "closed" && row.print_snapshot) {
      // A closed list always reprints exactly as it was when it was closed.
      const snap = row.print_snapshot;
      const { logo_path, watermark_path, ...settings } = snap.settings;
      lists.push({
        settings: { ...settings, paper_size: settings.paper_size ?? "letter" },
        logoUrl: logoUrl(logo_path),
        watermarkUrl: logoUrl(watermark_path ?? logo_path),
        committee: snap.committee,
        trip: snap.trip,
        adults: snap.passengers.filter((p) => !p.is_child),
        children: snap.passengers.filter((p) => p.is_child),
        isDraft: false,
      });
      continue;
    }
    const sorted = [...row.trip_passengers].sort((a, b) => a.seat_order - b.seat_order);
    lists.push({
      ...(live as NonNullable<typeof live>),
      trip: {
        id: row.id,
        trip_date: row.trip_date,
        owner_title: row.vehicles?.owner_title ?? "none",
        owner_name: row.vehicles?.owner_name ?? "",
        registration_no: row.vehicles?.registration_no ?? "",
        driver_name: (row.driver_id && driverName.get(row.driver_id)) || "",
        route_name: row.routes?.name ?? "",
        marshal_name: row.marshal_name,
      },
      adults: sorted.filter((p) => !p.is_child),
      children: sorted.filter((p) => p.is_child),
      isDraft: true,
    });
  }
  return lists;
}
