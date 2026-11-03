"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ZodTypeAny } from "zod";
import { SETUP_DEFAULTS } from "@/lib/setup-defaults";
import { adminAccountSchema, committeeSchema, limitsSchema, routeSchema, settingsSchema } from "@/lib/schemas";
import { idbDelete, idbGet, idbSet } from "@/lib/idb";
import { Alert, Button, Card, Field, LinkButton } from "@/components/ui";
import { PasswordField } from "@/components/password-field";

type Defaults = typeof SETUP_DEFAULTS;
type Errors = Record<string, string>;

const STEPS = ["Setup code", "Admin account", "Association details", "Logo and paper", "Committee", "Route and limits", "Summary"];
const STATE_KEY = "qibing-setup";
const LOGO_KEY = "qibing-setup-logo";
const WATERMARK_KEY = "qibing-setup-watermark";

function errorsFrom(schema: ZodTypeAny, value: unknown): Errors {
  const r = schema.safeParse(value);
  if (r.success) return {};
  const out: Errors = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function strength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const label = pw.length < 8 ? "Too short" : score <= 2 ? "Weak" : score === 3 ? "Fair" : score === 4 ? "Good" : "Strong";
  return { score, label };
}

export function SetupWizard({ defaults }: { defaults: Defaults }) {
  const [step, setStep] = useState(0);
  const [code, setCode] = useState("");
  const [account, setAccount] = useState({ full_name: "", username: "", password: "", confirm: "" });
  const [settings, setSettings] = useState({
    association_name: defaults.association_name, short_name: defaults.short_name,
    street_address: defaults.street_address, town: defaults.town, postal_code: defaults.postal_code,
    cell_no: defaults.cell_no, email: defaults.email, registration_no: defaults.registration_no,
    chairperson_line: defaults.chairperson_line, secretary_line: defaults.secretary_line,
    paper_size: defaults.paper_size as "letter" | "a4",
  });
  const [committee, setCommittee] = useState<{ role_title: string; name: string }[]>(defaults.committee.map((m) => ({ ...m })));
  const [route, setRoute] = useState({ ...defaults.route });
  const [limits, setLimits] = useState({ child_limit: String(defaults.child_limit) });
  const [logo, setLogo] = useState<File | null>(null);
  const [watermark, setWatermark] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [restored, setRestored] = useState(false);

  // Keep progress if the browser is refreshed (passwords are never stored).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STATE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        setStep(s.step ?? 0); setCode(s.code ?? "");
        setAccount((a) => ({ ...a, full_name: s.account?.full_name ?? "", username: s.account?.username ?? "" }));
        if (s.settings) setSettings(s.settings);
        if (s.committee) setCommittee(s.committee);
        if (s.route) setRoute(s.route);
        if (s.limits) setLimits(s.limits);
      }
    } catch {
      // nothing saved
    }
    Promise.all([
      idbGet<File>(LOGO_KEY).then((f) => f && setLogo(f)),
      idbGet<File>(WATERMARK_KEY).then((f) => f && setWatermark(f)),
    ]).finally(() => setRestored(true));
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        step, code, account: { full_name: account.full_name, username: account.username }, settings, committee, route, limits,
      }));
    } catch {
      // storage unavailable
    }
  }, [restored, step, code, account.full_name, account.username, settings, committee, route, limits]);

  const logoPreview = useMemo(() => (logo ? URL.createObjectURL(logo) : null), [logo]);
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);
  const watermarkPreview = useMemo(() => (watermark ? URL.createObjectURL(watermark) : null), [watermark]);
  useEffect(() => () => { if (watermarkPreview) URL.revokeObjectURL(watermarkPreview); }, [watermarkPreview]);

  const pw = strength(account.password);

  async function next() {
    setMessage(null);
    let errs: Errors = {};
    if (step === 0) {
      if (!code.trim()) errs = { code: "Enter the setup code" };
      else {
        setBusy(true);
        try {
          const res = await fetch("/api/setup/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
          const body = await res.json();
          if (body.complete) { window.location.assign("/setup"); return; }
          if (!res.ok) errs = { code: body.error };
        } catch {
          setMessage("Can't reach the server. Check the connection and try again.");
          setBusy(false);
          return;
        }
        setBusy(false);
      }
    }
    if (step === 1) errs = errorsFrom(adminAccountSchema, account);
    if (step === 2) errs = errorsFrom(settingsSchema, settings);
    if (step === 3) {
      const check = (f: File) =>
        !["image/png", "image/jpeg"].includes(f.type) ? "Use a PNG or JPG file." : f.size > 5 * 1024 * 1024 ? "The file is larger than 5 MB." : null;
      if (!logo) errs = { logo: "Upload the letterhead logo. It is printed on every list." };
      else if (check(logo)) errs = { logo: check(logo) as string };
      if (watermark && check(watermark)) errs = { ...errs, watermark: check(watermark) as string };
    }
    if (step === 4) errs = errorsFrom(committeeSchema, committee);
    if (step === 5) errs = { ...errorsFrom(routeSchema, route), ...errorsFrom(limitsSchema, limits) };
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function finish() {
    setMessage(null);
    if (!account.password) {
      setStep(1);
      setMessage("For safety the password isn't kept when the page reloads. Enter it again.");
      return;
    }
    if (!logo) { setStep(3); return; }
    setBusy(true);
    const form = new FormData();
    form.set("code", code);
    form.set("payload", JSON.stringify({ account, settings, committee, route, limits }));
    form.set("logo", logo);
    if (watermark) form.set("watermark", watermark);
    try {
      const res = await fetch("/api/setup", { method: "POST", body: form });
      const body = await res.json();
      if (body.complete) { window.location.assign("/setup"); return; }
      if (!res.ok) { setMessage(body.error); setBusy(false); return; }
      try { sessionStorage.removeItem(STATE_KEY); } catch { /* storage unavailable */ }
      await idbDelete(LOGO_KEY);
      await idbDelete(WATERMARK_KEY);
      // Sign straight in and go to the dashboard; fall back to the sign-in link.
      const signIn = await fetch("/api/auth/sign-in", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: account.username, secret: account.password }),
      }).catch(() => null);
      if (signIn?.ok) { window.location.assign("/admin"); return; }
      setDone(true);
    } catch {
      setMessage("Can't reach the server. Your details are kept; try again.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4 text-center">
        <h1 className="text-2xl">Setup complete</h1>
        <p>Sign in with the admin username <strong>{account.username}</strong> and the password you chose.</p>
        <LinkButton href="/login">Go to sign in</LinkButton>
      </main>
    );
  }

  const set = <T extends Record<string, unknown>>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (key: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => setter((v) => ({ ...v, [key]: e.target.value }));
  const setS = set(setSettings);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl">First-run setup</h1>
      <p className="mt-1 text-gray-700">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      <ol className="mt-4 flex gap-1" aria-hidden>
        {STEPS.map((s, i) => (
          <li key={s} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-gray-200"}`} />
        ))}
      </ol>

      <div className="mt-6 flex flex-col gap-4">
        {message && <Alert>{message}</Alert>}

        {step === 0 && (
          <>
            <p>Enter the setup code. It is the value of SETUP_CODE in the hosting settings, set by whoever installed the app.</p>
            <PasswordField label="Setup code" noun="setup code" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} error={errors.code} />
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Full name" value={account.full_name} onChange={set(setAccount)("full_name")} error={errors.full_name} autoComplete="name" />
            <Field label="Username" value={account.username} onChange={set(setAccount)("username")} error={errors.username}
              hint="3 to 30 letters, numbers or dots" autoCapitalize="none" spellCheck={false} />
            <PasswordField label="Password" value={account.password} onChange={set(setAccount)("password")} error={errors.password} autoComplete="new-password" />
            {account.password && (
              <div aria-live="polite">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`h-2 flex-1 rounded-full ${n <= pw.score ? (pw.score <= 2 ? "bg-red-600" : pw.score === 3 ? "bg-amber-500" : "bg-brand") : "bg-gray-200"}`} />
                  ))}
                </div>
                <p className="mt-1 text-sm">Strength: {pw.label}</p>
              </div>
            )}
            <PasswordField label="Confirm password" value={account.confirm} onChange={set(setAccount)("confirm")} error={errors.confirm} autoComplete="new-password" />
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-gray-700">These print on the letterhead of every list. Check them against the paper form.</p>
            <Field label="Association name" value={settings.association_name} onChange={setS("association_name")} error={errors.association_name} />
            <Field label="Short name (printed above the logo and in the header)" value={settings.short_name} onChange={setS("short_name")} error={errors.short_name} />
            <Field label="Street address" value={settings.street_address} onChange={setS("street_address")} error={errors.street_address} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Town" value={settings.town} onChange={setS("town")} error={errors.town} />
              <Field label="Postal code" inputMode="numeric" value={settings.postal_code} onChange={setS("postal_code")} error={errors.postal_code} />
            </div>
            <Field label="Cell number" inputMode="tel" hint="Any phone number" value={settings.cell_no} onChange={setS("cell_no")} error={errors.cell_no} />
            <Field label="Email" type="email" value={settings.email} onChange={setS("email")} error={errors.email} />
            <Field label="Registration number (printed after REG. NO.)" value={settings.registration_no} onChange={setS("registration_no")} error={errors.registration_no} />
            <Field label="Chairperson contact line" value={settings.chairperson_line} onChange={setS("chairperson_line")} error={errors.chairperson_line} />
            <Field label="Secretary contact line" value={settings.secretary_line} onChange={setS("secretary_line")} error={errors.secretary_line} />
            <Card>
              <p className="text-sm font-semibold">Prints under the title as:</p>
              <p className="mt-1 text-sm">Contact {settings.chairperson_line} and {settings.secretary_line}</p>
            </Card>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg">Letterhead logo (required)</h2>
            <p>Printed at the top left of every page. On the paper form this is the seal photo with the green KOPANO KE MATLA banners.</p>
            <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-brand px-4 py-6 text-center font-semibold text-brand-dark">
              <input type="file" accept="image/png,image/jpeg" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0] ?? null; setLogo(f); if (f) idbSet(LOGO_KEY, f); }} />
              {logo ? "Choose a different letterhead logo" : "Choose letterhead logo"}
            </label>
            {errors.logo && <p className="text-sm font-semibold text-red-700">{errors.logo}</p>}
            {logoPreview && (
              <Card className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Letterhead logo at print size" style={{ width: "81mm", height: "39mm" }} className="bg-white object-contain object-left" />
                <p className="text-sm">Shown at print size (81 x 39 mm).</p>
              </Card>
            )}

            <h2 className="mt-2 text-lg">Watermark logo (optional)</h2>
            <p>The faded logo behind the table, with QIBING TRANSPORT ASS around the top. If you skip this, the letterhead logo is used.</p>
            <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-brand px-4 py-6 text-center font-semibold text-brand-dark">
              <input type="file" accept="image/png,image/jpeg" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0] ?? null; setWatermark(f); if (f) idbSet(WATERMARK_KEY, f); }} />
              {watermark ? "Choose a different watermark" : "Choose watermark logo"}
            </label>
            {errors.watermark && <p className="text-sm font-semibold text-red-700">{errors.watermark}</p>}
            {watermarkPreview && (
              <Card className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={watermarkPreview} alt="Watermark as it prints" style={{ width: "40mm", height: "32mm", opacity: 0.28 }} className="bg-white object-fill" />
                <p className="text-sm">Shown faded, as it prints (scaled down).</p>
              </Card>
            )}

            <h2 className="mt-2 text-lg">Paper size</h2>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Paper size">
              {([["letter", "US Letter (as in the original Word form)"], ["a4", "A4 (most printers in South Africa)"]] as const).map(([value, label]) => (
                <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-300 px-4">
                  <input type="radio" name="paper_size" className="h-5 w-5 accent-[#1A7F37]" checked={settings.paper_size === value}
                    onChange={() => setSettings((v) => ({ ...v, paper_size: value }))} />
                  {label}
                </label>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="text-gray-700">These print on page 2 (Management committee), in this order.</p>
            {errors._ && <Alert>{errors._}</Alert>}
            {committee.map((m, i) => (
              <Card key={i} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field className="flex-1" label="Role" value={m.role_title} error={errors[`${i}.role_title`]}
                  onChange={(e) => setCommittee((c) => c.map((x, j) => (j === i ? { ...x, role_title: e.target.value } : x)))} />
                <Field className="flex-1" label="Name" value={m.name} error={errors[`${i}.name`]}
                  onChange={(e) => setCommittee((c) => c.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <div className="flex gap-1">
                  <Button type="button" variant="secondary" aria-label="Move up" disabled={i === 0}
                    onClick={() => setCommittee((c) => { const n = [...c]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}><ArrowUp size={20} /></Button>
                  <Button type="button" variant="secondary" aria-label="Move down" disabled={i === committee.length - 1}
                    onClick={() => setCommittee((c) => { const n = [...c]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })}><ArrowDown size={20} /></Button>
                  <Button type="button" variant="secondary" aria-label="Remove"
                    onClick={() => setCommittee((c) => c.filter((_, j) => j !== i))}><Trash2 size={20} /></Button>
                </div>
              </Card>
            ))}
            <Button type="button" variant="secondary" onClick={() => setCommittee((c) => [...c, { role_title: "", name: "" }])}>
              <Plus size={20} /> Add member
            </Button>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-lg">First route (the default)</h2>
            <Field label="Route name (printed in capitals on the list)" value={route.name} onChange={set(setRoute)("name")} error={errors.name} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="From" value={route.from_place} onChange={set(setRoute)("from_place")} error={errors.from_place} />
              <Field label="To" value={route.to_place} onChange={set(setRoute)("to_place")} error={errors.to_place} />
            </div>
            <h2 className="mt-2 text-lg">Limits per trip</h2>
            <p className="text-gray-700">There is no limit on adult passengers.</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Children under 3" inputMode="numeric" value={limits.child_limit} onChange={set(setLimits)("child_limit")} error={errors.child_limit} />
            </div>
          </>
        )}

        {step === 6 && (
          <Card className="flex flex-col gap-3 text-base">
            <p><strong>Admin:</strong> {account.full_name} ({account.username})</p>
            <p><strong>Association:</strong> {settings.association_name}, {settings.street_address}, {settings.town}, {settings.postal_code}</p>
            <p><strong>Cell / email:</strong> {settings.cell_no} / {settings.email}</p>
            <p><strong>Reg. no.:</strong> {settings.registration_no}</p>
            <p><strong>Letterhead logo:</strong> {logo ? logo.name : "missing"}</p>
            <p><strong>Watermark:</strong> {watermark ? watermark.name : "uses the letterhead logo"}</p>
            <p><strong>Paper:</strong> {settings.paper_size === "a4" ? "A4" : "US Letter"}</p>
            <p><strong>Committee:</strong> {committee.map((m) => `${m.role_title}: ${m.name}`).join("; ")}</p>
            <p><strong>Default route:</strong> {route.name}</p>
            <p><strong>Limits:</strong> no adult limit, {limits.child_limit} children per trip</p>
          </Card>
        )}

        <div className="mt-2 flex gap-3">
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={() => { setErrors({}); setStep((s) => s - 1); }} disabled={busy}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" className="flex-1" onClick={next} disabled={busy}>{busy ? "Checking…" : "Next"}</Button>
          ) : (
            <Button type="button" className="flex-1" onClick={finish} disabled={busy}>{busy ? "Saving…" : "Finish setup"}</Button>
          )}
        </div>
      </div>
    </main>
  );
}
