"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import type { Option } from "./new-list-form";

/** The association's main destinations, offered in a dropdown before typing. */
const MAIN_TOWNS = ["Bloemfontein", "Welkom", "Klerksdorp", "Kimberley", "Carletonville", "Johannesburg", "Rustenburg", "Botshabelo"];

/** The main destinations are in a dropdown; any other route is found by typing the town,
 *  since hundreds of routes are too many for a dropdown on a phone.
 *  A town with no route yet can be added from here by anyone. */
export function RoutePicker({ routes: loaded, value, onChange, error }: {
  routes: Option[]; value: string; onChange: (id: string) => void; error?: string;
}) {
  const [added, setAdded] = useState<Option[]>([]);
  const routes = useMemo(() => [...loaded, ...added.filter((a) => !loaded.some((r) => r.id === a.id))], [loaded, added]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const selected = routes.find((r) => r.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // The route chosen before "Change", so it can be kept. While changing, no route is chosen,
  // so a list is never started on the old route just because a typed town was not tapped.
  const [previous, setPrevious] = useState<Option | null>(null);

  const dest = (r: Option) => r.label.toLowerCase().split(" to ").slice(1).join(" to ");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // Match on the destination first ("kim" → "Wepener to Kimberley"), then anywhere in the name.
    return [...routes.filter((r) => dest(r).startsWith(q)), ...routes.filter((r) => !dest(r).startsWith(q) && r.label.toLowerCase().includes(q))].slice(0, 8);
  }, [query, routes]);

  // Offered when no route ends at exactly the typed town, even if other routes match part of it.
  const town = query.trim().replace(/\s+/g, " ");
  const canAdd = town.length >= 1 && !routes.some((r) => dest(r) === town.toLowerCase());

  function choose(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  // A main town is used straight away; its route is added first if it does not exist yet.
  function pickMain(name: string) {
    if (!name) return;
    const existing = routes.find((r) => dest(r) === name.toLowerCase());
    if (existing) choose(existing.id);
    else addTown(name);
  }

  async function addTown(name = town) {
    setAddError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ town: name }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setAddError(body.error ?? "The route could not be added.");
      setAdded((a) => [...a, { id: body.id, label: body.label }]);
      choose(body.id);
    } catch {
      setAddError("Can't reach the server. Check your signal and try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="route_main" className="text-base font-semibold">Route</label>
      {selected && !open ? (
        <div className="flex min-h-12 items-center justify-between gap-2 rounded-lg border-2 border-gray-300 bg-white pl-3">
          <span className="font-semibold">{selected.label}</span>
          <button type="button" className="min-h-11 px-3 font-semibold text-brand underline" onClick={() => { setPrevious(selected); onChange(""); setOpen(true); setQuery(""); }}>
            Change
          </button>
        </div>
      ) : (
        <div className="relative flex flex-col gap-1.5">
          <select id="route_main" value="" disabled={adding} onChange={(e) => pickMain(e.target.value)} aria-invalid={!!error}
            className={clsx("min-h-12 rounded-lg border-2 bg-white px-3 text-base", error ? "border-red-700" : "border-gray-300 focus:border-brand")}>
            <option value="">{adding ? "Adding…" : "Choose a destination…"}</option>
            {MAIN_TOWNS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label htmlFor="route_search" className="text-sm text-gray-700">Or type another town</label>
          <input
            id="route_search"
            autoComplete="off"
            placeholder="Type the destination town"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAddError(null); }}
            aria-invalid={!!error}
            className={clsx("min-h-12 w-full rounded-lg border-2 bg-white px-3 text-base", error ? "border-red-700" : "border-gray-300 focus:border-brand")}
          />
          {matches.length > 0 && (
            <ul className="absolute inset-x-0 z-10 mt-1 overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-lg" role="listbox">
              {matches.map((r) => (
                <li key={r.id}>
                  <button type="button" className="min-h-12 w-full px-3 text-left hover:bg-card"
                    onClick={() => choose(r.id)}>
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && matches.length > 0 && <p className="mt-1 text-sm text-gray-600">Tap the route in the list to choose it.</p>}
          {query.trim() && matches.length === 0 && <p className="mt-1 text-sm text-gray-600">No route to that town yet.</p>}
          {canAdd && (
            <button type="button" disabled={adding} className="mt-1 min-h-11 text-left font-semibold text-brand underline disabled:opacity-60" onClick={() => addTown()}>
              {adding ? "Adding…" : `+ Add a route to ${town}`}
            </button>
          )}
          {addError && <p className="text-sm font-semibold text-red-700">{addError}</p>}
          {previous && (
            <button type="button" className="mt-1 text-sm text-brand underline" onClick={() => choose(previous.id)}>Keep {previous.label}</button>
          )}
        </div>
      )}
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
