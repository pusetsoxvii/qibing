import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type Role = "admin" | "marshal";
export interface Profile {
  id: string;
  full_name: string;
  username: string;
  role: Role;
  active: boolean;
  must_change_pin: boolean;
}

/** Each username maps to an internal address; nobody needs a real email address. */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${env.internalEmailDomain()}`;
}

/** The signed-in person's profile, or null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, role, active, must_change_pin")
    .eq("id", auth.user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

/** Use in pages: sends anyone not allowed to the right place with a reason. */
export async function requireProfile(options: { role?: Role; allowPinChange?: boolean } = {}): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/api/auth/sign-out?reason=deactivated");
  if (profile.must_change_pin && !options.allowPinChange) redirect("/change-pin");
  if (options.role === "admin" && profile.role !== "admin") redirect("/lists?notice=admin-only");
  return profile;
}

export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : "/dashboard";
}
