"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "@/lib/schemas";
import { t } from "@/lib/strings";
import { Alert, Button, Field } from "@/components/ui";
import { PasswordField } from "@/components/password-field";

type Values = { username: string; secret: string };

export function LoginForm({ notice }: { notice: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(values: Values) {
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? t.generic);
      window.location.assign(body.redirect);
    } catch {
      setError(t.login.network);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {notice && <Alert tone="info">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      <Field
        label={t.login.username}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        error={formState.errors.username?.message}
        {...register("username")}
      />
      <PasswordField
        label={t.login.secret}
        noun="PIN or password"
        autoComplete="current-password"
        error={formState.errors.secret?.message}
        {...register("secret")}
      />
      <Button type="submit" block disabled={formState.isSubmitting}>
        {formState.isSubmitting ? t.login.signingIn : t.login.submit}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setForgot((f) => !f)} aria-expanded={forgot}>
        {t.login.forgot}
      </Button>
      {forgot && <Alert tone="info">{t.login.forgotAnswer}</Alert>}
    </form>
  );
}
