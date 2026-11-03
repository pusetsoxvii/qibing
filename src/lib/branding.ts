import "server-only";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export interface Branding {
  association_name: string | null;
  short_name: string | null;
  logo_path: string | null;
  setup_complete: boolean;
}

/** Name and logo for screens shown before sign-in. Contains no personal data. */
export async function getBranding(): Promise<Branding> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_branding");
  if (error) throw new Error("Could not reach the database. Check the environment variables and that the migrations have been run.");
  const row = (Array.isArray(data) ? data[0] : data) as Branding | undefined;
  return row ?? { association_name: null, short_name: null, logo_path: null, setup_complete: false };
}

/** Public URL of a file in the branding bucket. */
export function logoUrl(path: string): string {
  return `${env.supabaseUrl()}/storage/v1/object/public/branding/${encodeURIComponent(path)}`;
}
