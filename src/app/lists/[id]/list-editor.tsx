"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatPhone, formatRand } from "@/lib/format";
import { tripPassengerSchema, type TripPassengerInput } from "@/lib/schemas";
import { Alert, Button, Card, EmptyState, Field, LinkButton } from "@/components/ui";

export interface ListPassenger {
  id: string; full_name: string; from_address: string; destination_address: string;
  next_of_kin_no: string; paid_cents: number; is_child: boolean; seat_order: number;
}

interface Suggestion {
  id: string; full_name: string; next_of_kin_no: string;
  last_from_address: string | null; last_destination_address: string | null;
}

type Errors = Record<string, string>;

/** randomUUID only exists on HTTPS pages; phones testing over plain http on the LAN use getRandomValues. */
function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const blank = (isChild: boolean): TripPassengerInput => ({
  id: newId(), passenger_id: "", full_name: "", from_address: "", destination_address: "",
  next_of_kin_no: "", paid: "", is_child: isChild,
});

async function send(url: string, init: RequestInit): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return body.error ?? "That didn't work. Try again.";
  } catch {
    return "Can't reach the server. Check your signal and try again.";
  }
}

export function ListEditor({ tripId, closed, hasDriver, isAdmin, passengers, childLimit }: {
  tripId: string; closed: boolean; hasDriver: boolean; isAdmin: boolean; passengers: ListPassenger[]; childLimit: number;
}) {
  const router = useRouter();
  const adults = passengers.filter((p) => !p.is_child);
  const children = passengers.filter((p) => p.is_child);
  const childrenFull = children.length >= childLimit;

  const [v, setV] = useState<TripPassengerInput>(() => blank(false));
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [reason, setReason] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  // Suggest people already in the directory while the name is typed.
  useEffect(() => {
    if (v.passenger_id || v.full_name.trim().length < 2) return setSuggestions([]);
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/passengers?q=${encodeURIComponent(v.full_name.trim())}`).catch(() => null);
      const body = res?.ok ? await res.json() : { results: [] };
      setSuggestions(body.results ?? []);
    }, 250);
    return () => clearTimeout(timer);
  }, [v.full_name, v.passenger_id]);

  const set = (key: keyof TripPassengerInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [key]: e.target.value, ...(key === "full_name" || key === "next_of_kin_no" ? { passenger_id: "" } : {}) }));

  function choose(s: Suggestion) {
    setV((cur) => ({
      ...cur, passenger_id: s.id, full_name: s.full_name, next_of_kin_no: formatPhone(s.next_of_kin_no),
      from_address: cur.from_address || s.last_from_address || "", destination_address: cur.destination_address || s.last_destination_address || "",
    }));
    setSuggestions([]);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const r = tripPassengerSchema.safeParse(v);
    if (!r.success) {
      const out: Errors = {};
      for (const issue of r.error.issues) out[issue.path.join(".")] ??= issue.message;
      return setErrors(out);
    }
    setErrors({});
    setBusy(true);
    const error = await send(`/api/lists/${tripId}/passengers`, { method: "POST", body: JSON.stringify(v) });
    setBusy(false);
    if (error) return setMessage({ tone: "error", text: error });
    setMessage({ tone: "success", text: `${v.full_name.trim()} was added.` });
    // Keep the trip's usual pick-up and destination for the next person.
    setV({ ...blank(v.is_child), from_address: v.from_address, destination_address: v.destination_address });
    router.refresh();
    nameRef.current?.focus();
  }

  async function remove(p: ListPassenger) {
    if (!window.confirm(`Take ${p.full_name} off this list?`)) return;
    setMessage(null);
    const error = await send(`/api/lists/${tripId}/passengers/${p.id}`, { method: "DELETE" });
    if (error) return setMessage({ tone: "error", text: error });
    router.refresh();
  }

  async function changeStatus(action: "close" | "reopen") {
    if (action === "close" && !window.confirm("Close this list? It can no longer be changed, and it reprints exactly as it is now.")) return;
    setMessage(null);
    setBusy(true);
    const error = await send(`/api/lists/${tripId}/status`, { method: "POST", body: JSON.stringify({ action, reason }) });
    setBusy(false);
    if (error) return setMessage({ tone: "error", text: error });
    setReason("");
    setMessage({ tone: "success", text: action === "close" ? "The list is closed." : "The list is open again." });
    router.refresh();
  }

  const paid = passengers.reduce((s, p) => s + p.paid_cents, 0);
  const typeFull = v.is_child && childrenFull;

  const table = (rows: ListPassenger[], title: string, limit?: number) => (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg">{title} ({limit === undefined ? rows.length : `${rows.length} of ${limit}`})</h2>
      {rows.length === 0 ? (
        <p className="text-gray-700">None yet.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-gray-200 rounded-lg border border-gray-200">
          {rows.map((p, i) => (
            <li key={p.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-semibold">{i + 1}. {p.full_name}</p>
                <p className="text-sm text-gray-700">{p.from_address} → {p.destination_address}</p>
                <p className="text-sm text-gray-700">Next of kin {formatPhone(p.next_of_kin_no)} · Paid {formatRand(p.paid_cents)}</p>
              </div>
              {!closed && (
                <button type="button" onClick={() => remove(p)} aria-label={`Remove ${p.full_name}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-50">
                  <Trash2 size={20} />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-5">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <p className="font-semibold">Adults {adults.length} · Children {children.length} of {childLimit} · Paid {formatRand(paid)}</p>

      {!closed && (
        <Card>
          <h2 className="text-lg">Add a passenger</h2>
          <form onSubmit={add} className="mt-4 flex flex-col gap-4" noValidate>
            <fieldset className="flex gap-2">
              <legend className="sr-only">Passenger type</legend>
              {([false, true] as const).map((child) => (
                <Button key={String(child)} type="button" variant={v.is_child === child ? "primary" : "secondary"}
                  aria-pressed={v.is_child === child} onClick={() => setV((s) => ({ ...s, is_child: child }))}>
                  {child ? "Child under 3" : "Adult"}
                </Button>
              ))}
            </fieldset>
            {typeFull && (
              <Alert tone="warning">All {childLimit} child places are taken.</Alert>
            )}
            <div className="relative">
              <Field ref={nameRef} label="Name and surname" name="full_name" autoComplete="off" value={v.full_name}
                onChange={set("full_name")} error={errors.full_name}
                hint={v.passenger_id ? "Registered passenger" : "Type 2 letters to find someone registered before"} />
              {suggestions.length > 0 && (
                <ul className="absolute inset-x-0 z-10 mt-1 overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-lg" role="listbox">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => choose(s)} className="flex min-h-12 w-full flex-col items-start px-3 py-2 text-left hover:bg-card">
                        <span className="font-semibold">{s.full_name}</span>
                        <span className="text-sm text-gray-700">Next of kin {formatPhone(s.next_of_kin_no)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From address" name="from_address" value={v.from_address} onChange={set("from_address")} error={errors.from_address} />
              <Field label="Destination address" name="destination_address" value={v.destination_address} onChange={set("destination_address")} error={errors.destination_address} />
              <Field label="Next of kin contact no." name="next_of_kin_no" type="tel" inputMode="tel" hint="Any phone number"
                value={v.next_of_kin_no} onChange={set("next_of_kin_no")} error={errors.next_of_kin_no} />
              <Field label="Paid amount (R)" name="paid" inputMode="decimal" hint="e.g. 350 or 350.50"
                value={v.paid} onChange={set("paid")} error={errors.paid} />
            </div>
            <Button type="submit" block disabled={busy || typeFull}>{busy ? "Adding…" : "Add passenger"}</Button>
          </form>
        </Card>
      )}

      {passengers.length === 0 && closed ? (
        <EmptyState title="No passengers on this list." />
      ) : (
        <>
          {table(adults, "Passengers")}
          {table(children, "Under 3yrs Old Children's", childLimit)}
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <LinkButton variant="secondary" href={`/print/trip/${tripId}`}>Print preview</LinkButton>
        {!closed && <Button type="button" disabled={busy || !hasDriver} onClick={() => changeStatus("close")}>Close list</Button>}
      </div>
      {!closed && !hasDriver && <p className="-mt-2 text-sm text-gray-700">Set the driver above to close this list.</p>}

      {closed && isAdmin && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg">Reopen this list</h2>
          <Field label="Reason" name="reason" value={reason} onChange={(e) => setReason(e.target.value)} hint="Saved in the audit log" />
          <Button type="button" variant="secondary" disabled={busy || reason.trim().length < 5} onClick={() => changeStatus("reopen")}>Reopen list</Button>
        </Card>
      )}
    </div>
  );
}
