import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatRand, todaySast } from "@/lib/format";
import { PROGRESS_SELECT, summarise, type ProgressTrip } from "@/lib/progress";
import { Alert, Badge, Button, Card, EmptyState } from "@/components/ui";
import { TripProgress } from "@/components/trip-progress";

interface Person { id: string; full_name: string; role: "admin" | "marshal"; active: boolean }

/** Each queue marshal's lists for one day (plus drafts left open from earlier days), and how full they are. */
export default async function MarshalProgressPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: asked } = await searchParams;
  const today = todaySast();
  const date = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today;
  const supabase = await createClient();

  const [{ data: people }, { data: trips, error }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, active").order("full_name").returns<Person[]>(),
    supabase
      .from("trips")
      .select(PROGRESS_SELECT)
      .or(`trip_date.eq.${date},status.eq.draft`)
      .order("created_at", { ascending: false })
      .returns<ProgressTrip[]>(),
    supabase.from("association_settings").select("child_limit").maybeSingle(),
  ]);
  const childLimit = settings?.child_limit ?? 3;

  const byPerson = new Map<string, ProgressTrip[]>();
  for (const t of trips ?? []) byPerson.set(t.marshal_id, [...(byPerson.get(t.marshal_id) ?? []), t]);

  // Everyone with lists, busiest-most-recently first; then active marshals who have not started one.
  const rows = (people ?? [])
    .filter((p) => byPerson.has(p.id) || (p.role === "marshal" && p.active))
    .map((p) => ({ person: p, trips: byPerson.get(p.id) ?? [], summary: summarise(byPerson.get(p.id) ?? []) }))
    .sort((a, b) => (b.summary.lastActivity ?? "").localeCompare(a.summary.lastActivity ?? "") || a.person.full_name.localeCompare(b.person.full_name));

  const all = summarise(trips ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Marshal progress</h1>
          <p className="text-gray-700">{date === today ? "Today" : "Day"}, {formatDate(date)}, and drafts still open from earlier days</p>
        </div>
        <form className="flex items-end gap-2" method="get">
          <label className="flex flex-col gap-1.5 font-semibold">
            Date
            <input type="date" name="date" defaultValue={date} max={today} className="min-h-12 rounded-lg border-2 border-gray-300 px-3 font-normal" />
          </label>
          <Button type="submit" variant="secondary">Show</Button>
        </form>
      </div>
      {error && <Alert>The lists could not be loaded. Refresh the page to try again.</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          ["Lists", String(all.lists)], ["Closed", String(all.closed)], ["Drafts open", String(all.drafts)],
          ["Adult passengers", String(all.adults)], ["Total paid", formatRand(all.paid)],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-gray-700">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-brand-dark">{value}</p>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No queue marshals yet">Add them in Marshals. Their progress shows here once they start lists.</EmptyState>
      ) : (
        rows.map(({ person, trips: list, summary: s }) => (
          <Card key={person.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg">{person.full_name}</h2>
                <p className="text-gray-700">
                  {s.lists === 0
                    ? "No lists started"
                    : `${s.lists} list${s.lists === 1 ? "" : "s"} · ${s.closed} closed · ${s.drafts} draft · ${s.adults} adults · ${s.children} children · ${formatRand(s.paid)}`}
                </p>
                {s.lastActivity && <p className="text-sm text-gray-700">Last activity {formatDateTime(s.lastActivity)}</p>}
              </div>
              <div className="flex flex-wrap gap-1">
                {person.role === "admin" && <Badge tone="admin">Admin</Badge>}
                {!person.active && <Badge tone="inactive">Deactivated</Badge>}
                {s.noDriver > 0 && <Badge tone="locked">{s.noDriver} without driver</Badge>}
              </div>
            </div>
            {list.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2">
                {list.map((t) => <TripProgress key={t.id} trip={t} childLimit={childLimit} today={date} />)}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
