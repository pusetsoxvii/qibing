import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export function setupCodeMatches(code: unknown): boolean {
  if (typeof code !== "string") return false;
  const a = Buffer.from(code.trim());
  const b = Buffer.from(env.setupCode());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function adminExists(): Promise<boolean> {
  const { count, error } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error("Could not check the database. Have the migrations been run?");
  return (count ?? 0) > 0;
}

export const slowDown = () => new Promise((r) => setTimeout(r, 800));
