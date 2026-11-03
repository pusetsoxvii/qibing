"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDriverSchema, type SetDriver } from "@/lib/schemas";
import { Alert, Button, Card, Field, SelectField } from "@/components/ui";

/** Shown on a list saved without a driver: pick or register the driver once they arrive. */
export function DriverSetter({ tripId, drivers }: { tripId: string; drivers: { id: string; label: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState<SetDriver>({ driver_id: "", driver_name: "", driver_id_no: "", driver_cell: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof SetDriver) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [key]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const r = setDriverSchema.safeParse(v);
    if (!r.success) {
      const out: Record<string, string> = {};
      for (const issue of r.error.issues) out[issue.path.join(".")] ??= issue.message;
      return setErrors(out);
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch(`/api/lists/${tripId}/driver`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setMessage(body.error ?? "The driver could not be set.");
      router.refresh();
    } catch {
      setMessage("Can't reach the server. Check your signal and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-l-4 border-amber-600">
      <h2 className="text-lg">Driver not set yet</h2>
      <p className="text-gray-700">The list is saved. Set the driver when they arrive; the list can only be closed once it has one.</p>
      <form onSubmit={save} className="mt-4 flex flex-col gap-4" noValidate>
        {message && <Alert>{message}</Alert>}
        <SelectField label="Driver" name="set_driver_id" value={v.driver_id} onChange={set("driver_id")} error={errors.driver_id}>
          <option value="">Choose…</option>
          {drivers.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          <option value="new">+ Add a new driver</option>
        </SelectField>
        {v.driver_id === "new" && (
          <>
            <Field label="Driver's full name" name="set_driver_name" value={v.driver_name} onChange={set("driver_name")} error={errors.driver_name} />
            <Field label="ID or licence number" name="set_driver_id_no" autoCapitalize="characters" spellCheck={false}
              value={v.driver_id_no} onChange={set("driver_id_no")} error={errors.driver_id_no} />
            <Field label="Driver's cell number" name="set_driver_cell" type="tel" inputMode="tel" hint="Any phone number"
              value={v.driver_cell} onChange={set("driver_cell")} error={errors.driver_cell} />
          </>
        )}
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save driver"}</Button>
      </form>
    </Card>
  );
}
