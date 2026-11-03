import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatRand, todaySast } from "@/lib/format";
import { Alert, Card, EmptyState } from "@/components/ui";

interface Summary {
  lists_created: number; lists_closed: number; drafts_open: number;
  adult_passengers: number; children: number; total_paid_cents: number;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todaySast();
  const [{ data: summaryRows, error }, { data: activity }] = await Promise.all([
    supabase.rpc("dashboard_summary", { p_from: today, p_to: today }),
    supabase.from("audit_log").select("id, actor_name, action, entity, created_at").order("created_at", { ascending: false }).limit(10),
  ]);
  const s = (Array.isArray(summaryRows) ? summaryRows[0] : summaryRows) as Summary | undefined;
  const n = (v: number | undefined) => Number(v ?? 0);
  const avg = n(s?.adult_passengers) > 0 ? Math.round(n(s?.total_paid_cents) / n(s?.adult_passengers)) : 0;

  const cards = [
    { label: "Lists created", value: String(n(s?.lists_created)) },
    { label: "Lists closed", value: String(n(s?.lists_closed)) },
    { label: "Drafts still open (all days)", value: String(n(s?.drafts_open)) },
    { label: "Adult passengers", value: String(n(s?.adult_passengers)) },
    { label: "Children", value: String(n(s?.children)) },
    { label: "Total paid", value: formatRand(n(s?.total_paid_cents)) },
    { label: "Average paid per adult", value: formatRand(avg) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl">Dashboard</h1>
        <p className="text-gray-700">Today, {formatDate(today)}</p>
      </div>
      {error && <Alert>The figures could not be loaded. Refresh the page to try again.</Alert>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-sm text-gray-700">{c.label}</p>
            <p className="mt-1 text-3xl font-semibold text-brand-dark">{c.value}</p>
          </Card>
        ))}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg">Recent activity</h2>
        {activity && activity.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-base">
              <thead className="bg-card">
                <tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">Record</th></tr>
              </thead>
              <tbody>
                {activity.map((a, i) => (
                  <tr key={a.id} className={i % 2 ? "bg-card" : ""}>
                    <td className="whitespace-nowrap p-3">{formatDateTime(a.created_at)}</td>
                    <td className="p-3">{a.actor_name ?? "System"}</td>
                    <td className="p-3">{a.action.replaceAll("_", " ")}</td>
                    <td className="p-3">{a.entity.replaceAll("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No activity yet">Sign-ins and changes appear here as they happen.</EmptyState>
        )}
      </section>
      <p className="text-gray-700">
        See how each queue marshal is doing in <Link className="font-semibold text-brand underline" href="/admin/progress">Marshal progress</Link>.
        Add your Queue Marshals in <Link className="font-semibold text-brand underline" href="/admin/marshals">Marshals</Link>, or start a
        list and register passengers yourself in <Link className="font-semibold text-brand underline" href="/lists">Passenger lists</Link>.
      </p>
    </div>
  );
}
