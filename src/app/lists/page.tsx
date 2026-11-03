import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { formatDate, formatRand, todaySast } from "@/lib/format";
import { t } from "@/lib/strings";
import { Alert, Badge, Card, EmptyState, LinkButton } from "@/components/ui";

interface TripRow {
  id: string; trip_date: string; status: "draft" | "closed"; marshal_name: string; driver_id: string | null;
  vehicles: { registration_no: string } | null;
  routes: { name: string } | null;
  trip_passengers: { is_child: boolean; paid_cents: number }[];
}

export default async function TodaysListsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const { notice } = await searchParams;
  const supabase = await createClient();
  const today = todaySast();

  const [{ data: settings }, { data, error }] = await Promise.all([
    supabase.from("association_settings").select("child_limit").maybeSingle(),
    supabase
      .from("trips")
      .select("id, trip_date, status, marshal_name, driver_id, vehicles(registration_no), routes(name), trip_passengers(is_child, paid_cents)")
      .or(`trip_date.eq.${today},status.eq.draft`)
      .order("trip_date", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<TripRow[]>(),
  ]);

  const trips = data ?? [];
  const unfinished = trips.filter((tr) => tr.status === "draft" && tr.trip_date < today);
  const todays = trips.filter((tr) => tr.trip_date === today);

  const renderTrip = (tr: TripRow) => {
    const adults = tr.trip_passengers.filter((p) => !p.is_child).length;
    const kids = tr.trip_passengers.filter((p) => p.is_child).length;
    const paid = tr.trip_passengers.reduce((s, p) => s + p.paid_cents, 0);
    return (
      <Card key={tr.id} className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-semibold">{tr.vehicles?.registration_no}</p>
            <p className="text-gray-700">{tr.routes?.name} · {formatDate(tr.trip_date)}</p>
            {isAdmin && <p className="text-gray-700">Marshal {tr.marshal_name}</p>}
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {tr.status === "draft" && !tr.driver_id && <Badge tone="locked">No driver yet</Badge>}
            <Badge tone={tr.status}>{tr.status === "draft" ? "Draft" : "Closed"}</Badge>
          </div>
        </div>
        <p>
          Adults {adults} · Children {kids} of {settings?.child_limit ?? 3} · Paid {formatRand(paid)}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <LinkButton href={`/lists/${tr.id}`}>{tr.status === "draft" ? "Open and add passengers" : "Open"}</LinkButton>
          <LinkButton variant="secondary" href={`/print/trip/${tr.id}`}>Print preview</LinkButton>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Today&apos;s Lists</h1>
      <p className="-mt-3 text-gray-700">{formatDate(today)} · {profile.full_name}</p>
      <LinkButton href="/lists/new">Start a new list</LinkButton>
      {notice && t.notices[notice] && <Alert tone="info">{t.notices[notice]}</Alert>}
      {error && <Alert>The lists could not be loaded. Pull down to refresh, or check your signal.</Alert>}

      {unfinished.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg">Unfinished lists</h2>
          {unfinished.map(renderTrip)}
        </section>
      )}

      {todays.length > 0 ? (
        <section className="flex flex-col gap-3">{todays.map(renderTrip)}</section>
      ) : (
        !error && (
          <EmptyState title="No lists today.">
            Tap <span className="font-semibold">Start a new list</span> above. To work on paper instead, print a{" "}
            <Link href={isAdmin ? "/admin/blank-forms" : "/lists/blank-forms"} className="font-semibold text-brand underline">blank form</Link>.
          </EmptyState>
        )
      )}
    </div>
  );
}
