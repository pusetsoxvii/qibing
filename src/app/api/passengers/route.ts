import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Name suggestions from the passenger directory while a marshal types. */
export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("passengers")
    .select("id, full_name, next_of_kin_no, last_from_address, last_destination_address")
    .ilike("full_name", `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`)
    .order("full_name")
    .limit(8);
  if (error) return NextResponse.json({ error: "Search is not available right now." }, { status: 500 });
  return NextResponse.json({ results: data ?? [] });
}
