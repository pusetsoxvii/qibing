import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { badRequest, dbErrorResponse } from "@/lib/list-errors";

const schema = z.object({ town: z.string().trim().min(1, "Type the destination").max(80, "Destination is too long") });

/** Add a route from the association's town to any town (any active user may), or find the one that exists. */
export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const supabase = await createClient();

  const { data: id, error } = await supabase.rpc("add_route_to_town", { p_town: parsed.data.town });
  if (error) return dbErrorResponse(error, "The route could not be added.");
  const { data: route, error: readError } = await supabase.from("routes").select("id, name").eq("id", id as string).single();
  if (readError) return dbErrorResponse(readError, "The route could not be added.");
  return NextResponse.json({ ok: true, id: route.id, label: route.name });
}
