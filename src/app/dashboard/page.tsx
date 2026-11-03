import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { formatDate, formatRand, todaySast } from "@/lib/format";
import { PROGRESS_SELECT, summarise, type ProgressTrip } from "@/lib/progress";
import { Alert, Card, EmptyState, LinkButton } from "@/components/ui";
import { TripProgress } from "@/components/trip-progress";

/** The queue marshal's own day: figures, lists that need attention, and progress on each list. */
export default async function MarshalDashboardPage() {
  const profile = await requireProfile();
  const today = todaySast();
  const supabase = await createClient();
  const [{ data: trips, error }, { data: settings }] = await Promise.all([
    supabase
      .from("trips")
      .select(PROGRESS_SELECT)
      .eq("marshal_id", profile.id)
      .or(`trip_date.eq.${today},status.eq.draft`)
      .order("created_at", { ascending: false })
      .returns<ProgressTrip[]>(),
    supabase.from("association_settings").select("child_limit").maybeSingle(),
  ]);
  const childLimit = settings?.child_limit ?? 3;
  const all = trips ?? [];
  const todays = all.filter((t) => t.trip_date === today);
  const s = summarise(todays);
  const attention = all.filter((t) => t.status === "draft" && (!t.driver_id || t.trip_date < today));

  const cards = [
    ["Lists today", String(s.lists)], ["Closed", String(s.closed)], ["Still open", String(s.drafts)],
    ["Adults", String(s.adults)], ["Children", String(s.children)], ["Paid today", formatRand(s.paid)],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">Dashboard</h1>
        <p className="text-gray-700">{formatDate(today)} · {profile.full_name}</p>
      </div>
      {error && <Alert>Your figures could not be loaded. Pull down to refresh, or check your signal.</Alert>}
      <LinkButton href="/lists/new">Start a new list</LinkButton>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-gray-700">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-brand-dark">{value}</p>
          </Card>
        ))}
      </div>

      {attention.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Needs attention</h2>
          <ul className="flex flex-col gap-1 rounded-lg border-l-4 border-amber-600 bg-amber-50 p-3 text-amber-900">
            {attention.map((t) => (
              <li key={t.id}>
                <a className="font-semibold underline" href={`/lists/${t.id}`}>{t.vehicles?.registration_no}</a>
                {" "}{!t.driver_id ? "has no driver yet" : `is still open from ${formatDate(t.trip_date)}`}
                {!t.driver_id && t.trip_date < today ? ` (from ${formatDate(t.trip_date)})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg">Today&apos;s progress</h2>
        {todays.length === 0 ? (
          <EmptyState title="No lists today.">Tap Start a new list to begin.</EmptyState>
        ) : (
          todays.map((t) => <TripProgress key={t.id} trip={t} childLimit={childLimit} today={today} />)
        )}
      </section>
    </div>
  );
}
