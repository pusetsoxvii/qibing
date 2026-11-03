import Link from "next/link";
import { formatDate, formatDateTime, formatRand } from "@/lib/format";
import { tripFigures, type ProgressTrip } from "@/lib/progress";
import { Badge } from "@/components/ui";

/** One list with how full it is, shown on both dashboards. Links to the list. */
export function TripProgress({ trip, childLimit, today }: { trip: ProgressTrip; childLimit: number; today: string }) {
  const f = tripFigures(trip);
  return (
    <Link href={`/lists/${trip.id}`} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 hover:bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">
          {trip.vehicles?.registration_no} · {trip.routes?.name}
          {trip.trip_date !== today && <span className="font-normal text-gray-700"> · {formatDate(trip.trip_date)}</span>}
        </span>
        <span className="flex flex-wrap gap-1">
          {trip.status === "draft" && !trip.driver_id && <Badge tone="locked">No driver yet</Badge>}
          <Badge tone={trip.status}>{trip.status === "draft" ? "Draft" : "Closed"}</Badge>
        </span>
      </div>
      <p className="text-sm text-gray-700">
        Adults {f.adults} · Children {f.children}/{childLimit} · Paid {formatRand(f.paid)} · Last activity {formatDateTime(f.lastActivity)}
      </p>
    </Link>
  );
}
