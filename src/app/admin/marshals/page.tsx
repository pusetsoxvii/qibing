import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { MarshalsManager, type MarshalRow } from "./marshals-manager";

export default async function MarshalsPage() {
  const me = await requireProfile({ role: "admin" });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, role, active, locked_until, last_sign_in_at, must_change_pin")
    .order("active", { ascending: false })
    .order("full_name");
  const { data: counts } = await supabase.from("trips").select("marshal_id");
  const listCount = new Map<string, number>();
  (counts ?? []).forEach((r) => listCount.set(r.marshal_id, (listCount.get(r.marshal_id) ?? 0) + 1));

  const rows: MarshalRow[] = (data ?? []).map((p) => ({ ...p, lists: listCount.get(p.id) ?? 0 }));
  return <MarshalsManager rows={rows} meId={me.id} loadError={!!error} />;
}
