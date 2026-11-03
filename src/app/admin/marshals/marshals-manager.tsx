"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMarshalSchema, pinSchema } from "@/lib/schemas";
import { formatDateTime } from "@/lib/format";
import { Alert, Badge, Button, Card, EmptyState, Field } from "@/components/ui";

export interface MarshalRow {
  id: string; full_name: string; username: string; role: "admin" | "marshal"; active: boolean;
  locked_until: string | null; last_sign_in_at: string | null; must_change_pin: boolean; lists: number;
}

type NewMarshal = { full_name: string; username: string; pin: string };

export function MarshalsManager({ rows, meId, loadError }: { rows: MarshalRow[]; meId: string; loadError: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const form = useForm<NewMarshal>({ resolver: zodResolver(createMarshalSchema) });

  async function create(values: NewMarshal) {
    setMessage(null);
    const res = await fetch("/api/admin/marshals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage({ tone: "error", text: body.error ?? "The account could not be created." });
    setMessage({ tone: "success", text: `${values.full_name} can now sign in as "${values.username.toLowerCase()}" with the PIN you set.` });
    form.reset();
    router.refresh();
  }

  async function act(row: MarshalRow, action: "deactivate" | "reactivate" | "unlock" | "reset_pin", pin?: string) {
    if (action === "deactivate" && !window.confirm(`Deactivate ${row.full_name}? They are signed out at once. Their lists stay on record.`)) return;
    setBusyId(row.id);
    setMessage(null);
    const res = await fetch(`/api/admin/marshals/${row.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, pin }),
    });
    const body = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      if (action === "reset_pin") return setResetError(body.error ?? "The PIN could not be reset.");
      return setMessage({ tone: "error", text: body.error ?? "That didn't work. Try again." });
    }
    const done = { deactivate: "deactivated", reactivate: "reactivated", unlock: "unlocked", reset_pin: "given a new PIN" }[action];
    setMessage({ tone: "success", text: `${row.full_name} was ${done}.` });
    setResetFor(null); setResetPin(""); setResetError(null);
    router.refresh();
  }

  const isLocked = (r: MarshalRow) => !!r.locked_until && new Date(r.locked_until) > new Date();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Marshals</h1>
      {loadError && <Alert>The accounts could not be loaded. Refresh the page.</Alert>}
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <Card>
        <h2 className="text-lg">Add a marshal</h2>
        <form onSubmit={form.handleSubmit(create)} className="mt-4 grid gap-4 md:grid-cols-3" noValidate>
          <Field label="Full name" error={form.formState.errors.full_name?.message} {...form.register("full_name")} />
          <Field label="Username" hint="3 to 30 letters, numbers or dots" autoCapitalize="none" spellCheck={false}
            error={form.formState.errors.username?.message} {...form.register("username")} />
          <Field label="PIN" hint="6 to 8 digits" inputMode="numeric" autoComplete="off"
            error={form.formState.errors.pin?.message} {...form.register("pin")} />
          <div className="md:col-span-3">
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating…" : "Create marshal"}</Button>
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No accounts yet">Add your first marshal with the form above.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[720px] text-left text-base">
            <thead className="bg-card">
              <tr><th className="p-3">Name</th><th className="p-3">Username</th><th className="p-3">Status</th><th className="p-3">Lists</th><th className="p-3">Last sign-in</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`align-top ${i % 2 ? "bg-card" : ""}`}>
                  <td className="p-3 font-semibold">{r.full_name}</td>
                  <td className="p-3">{r.username}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {r.role === "admin" && <Badge tone="admin">Admin</Badge>}
                      {r.active ? <Badge tone="closed">Active</Badge> : <Badge tone="inactive">Deactivated</Badge>}
                      {isLocked(r) && <Badge tone="locked">Locked</Badge>}
                      {r.must_change_pin && r.active && <Badge tone="draft">Must set new PIN</Badge>}
                    </div>
                  </td>
                  <td className="p-3">{r.lists}</td>
                  <td className="whitespace-nowrap p-3">{r.last_sign_in_at ? formatDateTime(r.last_sign_in_at) : "Never"}</td>
                  <td className="p-3">
                    {r.id === meId ? (
                      <span className="text-gray-600">You</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {r.active ? (
                            <Button variant="secondary" disabled={busyId === r.id} onClick={() => act(r, "deactivate")}>Deactivate</Button>
                          ) : (
                            <Button variant="secondary" disabled={busyId === r.id} onClick={() => act(r, "reactivate")}>Reactivate</Button>
                          )}
                          {r.role === "marshal" && r.active && (
                            <Button variant="secondary" onClick={() => { setResetFor(resetFor === r.id ? null : r.id); setResetPin(""); setResetError(null); }}>
                              Reset PIN
                            </Button>
                          )}
                          {isLocked(r) && <Button variant="secondary" disabled={busyId === r.id} onClick={() => act(r, "unlock")}>Unlock</Button>}
                        </div>
                        {resetFor === r.id && (
                          <form className="flex items-end gap-2" noValidate
                            onSubmit={(e) => {
                              e.preventDefault();
                              const ok = pinSchema.safeParse(resetPin);
                              if (!ok.success) return setResetError(ok.error.issues[0].message);
                              act(r, "reset_pin", resetPin);
                            }}>
                            <Field label="New PIN" name={`pin-${r.id}`} inputMode="numeric" autoComplete="off" value={resetPin}
                              onChange={(e) => setResetPin(e.target.value)} error={resetError ?? undefined} />
                            <Button type="submit" disabled={busyId === r.id}>Save</Button>
                          </form>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
