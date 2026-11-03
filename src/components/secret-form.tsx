"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newSecretSchema } from "@/lib/schemas";
import { Alert, Button } from "@/components/ui";
import { PasswordField } from "@/components/password-field";

type Values = { current: string; next: string; confirm: string };

export function SecretForm({ role, forced }: { role: "admin" | "marshal"; forced?: boolean }) {
  const label = role === "admin" ? "password" : "PIN";
  const numeric = role === "marshal" ? ({ inputMode: "numeric" as const }) : {};
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(newSecretSchema(role)) });

  async function submit(values: Values) {
    setMessage(null);
    try {
      const res = await fetch("/api/account/secret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const body = await res.json();
      if (!res.ok) return setMessage({ tone: "error", text: body.error });
      if (forced) return window.location.assign(body.redirect);
      form.reset();
      setMessage({ tone: "success", text: `Your ${label} has been changed.` });
    } catch {
      setMessage({ tone: "error", text: "Can't reach the server. Check your signal and try again." });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <PasswordField label={forced ? `Temporary ${label}` : `Current ${label}`} noun={label} autoComplete="current-password" {...numeric}
        error={form.formState.errors.current?.message} {...form.register("current")} />
      <PasswordField label={`New ${label}`} noun={label} autoComplete="new-password" {...numeric}
        hint={role === "admin" ? "At least 8 characters" : "6 to 8 digits"}
        error={form.formState.errors.next?.message} {...form.register("next")} />
      <PasswordField label={`Confirm new ${label}`} noun={label} autoComplete="new-password" {...numeric}
        error={form.formState.errors.confirm?.message} {...form.register("confirm")} />
      <Button type="submit" block disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving…" : `Save new ${label}`}
      </Button>
    </form>
  );
}
