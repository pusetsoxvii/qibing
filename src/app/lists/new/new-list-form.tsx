"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { newTripSchema, type NewTrip } from "@/lib/schemas";
import { Alert, Button, Card, Field, SelectField } from "@/components/ui";
import { RoutePicker } from "./route-picker";

export type Option = { id: string; label: string };
type Errors = Record<string, string>;

function validate(value: NewTrip): Errors {
  const r = newTripSchema.safeParse(value);
  if (r.success) return {};
  const out: Errors = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function NewListForm(props: {
  canPickDate: boolean; today: string; routes: Option[]; defaultRouteId: string;
  vehicles: (Option & { driverId: string | null })[]; drivers: Option[]; loadError: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<NewTrip>({
    trip_date: props.today, route_id: props.defaultRouteId,
    vehicle_id: props.vehicles.length ? "" : "new", registration_no: "", owner_title: "none", owner_name: "",
    driver_id: props.drivers.length ? "" : "new", driver_name: "", driver_id_no: "", driver_cell: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof NewTrip) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [key]: e.target.value }));

  function pickVehicle(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const known = props.vehicles.find((x) => x.id === id);
    // The vehicle's usual driver is filled in, and can still be changed.
    setV((s) => ({ ...s, vehicle_id: id, driver_id: known?.driverId && !s.driver_id ? known.driverId : s.driver_id }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setMessage(body.error ?? "The list could not be started.");
      router.push(`/lists/${body.id}`);
    } catch {
      setMessage("Can't reach the server. Check your signal and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {props.loadError && <Alert>Some choices could not be loaded. Refresh the page.</Alert>}
      {message && <Alert>{message}</Alert>}

      <Card className="flex flex-col gap-4">
        {props.canPickDate ? (
          <Field label="Date" name="trip_date" type="date" value={v.trip_date} onChange={set("trip_date")} error={errors.trip_date} />
        ) : (
          <p><span className="font-semibold">Date:</span> today</p>
        )}
        <RoutePicker routes={props.routes} value={v.route_id} onChange={(id) => setV((s) => ({ ...s, route_id: id }))} error={errors.route_id} />
      </Card>

      <Card className="flex flex-col gap-4">
        <SelectField label="Vehicle" name="vehicle_id" value={v.vehicle_id} onChange={pickVehicle} error={errors.vehicle_id}>
          <option value="">Choose…</option>
          {props.vehicles.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          <option value="new">+ Add a new vehicle</option>
        </SelectField>
        {v.vehicle_id === "new" && (
          <>
            <Field label="Registration number" name="registration_no" autoCapitalize="characters" spellCheck={false} hint="e.g. ABC123FS"
              value={v.registration_no} onChange={set("registration_no")} error={errors.registration_no} />
            <SelectField label="Owner title" name="owner_title" value={v.owner_title} onChange={set("owner_title")}>
              <option value="none">None</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Ms">Ms</option>
            </SelectField>
            <Field label="Owner name" name="owner_name" value={v.owner_name} onChange={set("owner_name")} error={errors.owner_name} />
          </>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <SelectField label="Driver" name="driver_id" value={v.driver_id} onChange={set("driver_id")} error={errors.driver_id}>
          <option value="">Choose…</option>
          {props.drivers.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          <option value="new">+ Add a new driver</option>
          <option value="later">Driver not here yet (add later)</option>
        </SelectField>
        {v.driver_id === "later" && (
          <p className="text-gray-700">You can add passengers now. Set the driver on the list before you close it.</p>
        )}
        {v.driver_id === "new" && (
          <>
            <Field label="Driver's full name" name="driver_name" value={v.driver_name} onChange={set("driver_name")} error={errors.driver_name} />
            <Field label="ID or licence number" name="driver_id_no" autoCapitalize="characters" spellCheck={false}
              value={v.driver_id_no} onChange={set("driver_id_no")} error={errors.driver_id_no} />
            <Field label="Driver's cell number" name="driver_cell" type="tel" inputMode="tel" hint="Any phone number"
              value={v.driver_cell} onChange={set("driver_cell")} error={errors.driver_cell} />
          </>
        )}
      </Card>

      <Button type="submit" block disabled={busy}>{busy ? "Starting…" : "Start list"}</Button>
    </form>
  );
}
