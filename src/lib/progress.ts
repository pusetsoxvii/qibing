/** Figures for the marshal and office dashboards, worked out from the lists the user may see (RLS). */

export const PROGRESS_SELECT =
  "id, trip_date, status, marshal_id, marshal_name, driver_id, created_at, closed_at, vehicles(registration_no), routes(name), trip_passengers(is_child, paid_cents, created_at)";

export interface ProgressTrip {
  id: string;
  trip_date: string;
  status: "draft" | "closed";
  marshal_id: string;
  marshal_name: string;
  driver_id: string | null;
  created_at: string;
  closed_at: string | null;
  vehicles: { registration_no: string } | null;
  routes: { name: string } | null;
  trip_passengers: { is_child: boolean; paid_cents: number; created_at: string }[];
}

export interface TripFigures {
  adults: number;
  children: number;
  paid: number;
  /** The latest of: list started, passenger added, list closed. */
  lastActivity: string;
}

export function tripFigures(t: ProgressTrip): TripFigures {
  let last = t.closed_at && t.closed_at > t.created_at ? t.closed_at : t.created_at;
  let adults = 0, children = 0, paid = 0;
  for (const p of t.trip_passengers) {
    if (p.is_child) children++; else adults++;
    paid += p.paid_cents;
    if (p.created_at > last) last = p.created_at;
  }
  return { adults, children, paid, lastActivity: last };
}

export interface Summary {
  lists: number;
  closed: number;
  drafts: number;
  /** Drafts still waiting for their driver. */
  noDriver: number;
  adults: number;
  children: number;
  paid: number;
  lastActivity: string | null;
}

export function summarise(trips: ProgressTrip[]): Summary {
  const s: Summary = { lists: trips.length, closed: 0, drafts: 0, noDriver: 0, adults: 0, children: 0, paid: 0, lastActivity: null };
  for (const t of trips) {
    const f = tripFigures(t);
    if (t.status === "closed") s.closed++; else s.drafts++;
    if (t.status === "draft" && !t.driver_id) s.noDriver++;
    s.adults += f.adults;
    s.children += f.children;
    s.paid += f.paid;
    if (!s.lastActivity || f.lastActivity > s.lastActivity) s.lastActivity = f.lastActivity;
  }
  return s;
}
