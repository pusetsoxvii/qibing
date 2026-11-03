import { NextResponse } from "next/server";
import type { createClient } from "@/lib/supabase/server";
import { normalisePhone } from "@/lib/format";

/** Business-rule exceptions raised by the database, in words a marshal understands. */
const MESSAGES: Record<string, string> = {
  PASSENGER_LIMIT_REACHED: "This list is full. No more adult passengers can be added.",
  CHILD_LIMIT_REACHED: "Only 3 children under 3 years are allowed per trip.",
  LIST_CLOSED: "This list is closed. Ask the office to reopen it.",
  LIST_NOT_FOUND: "That list could not be found.",
  LIST_NOT_CLOSED: "This list is not closed.",
  DRIVER_EXISTS: "A driver with that ID or licence number is already registered. Pick them from the list.",
  DRIVER_REQUIRED: "Add the driver before closing this list.",
  REASON_REQUIRED: "Give a reason of at least 5 characters.",
  TOWN_NAME_INVALID: "Type a destination of up to 80 letters.",
  NOT_ALLOWED: "You are not allowed to do this.",
};

/** Turns a Supabase error into a JSON response with a readable message. */
export function dbErrorResponse(error: { message: string; code?: string }, fallback: string) {
  const known = Object.keys(MESSAGES).find((k) => error.message.includes(k));
  if (known) return NextResponse.json({ error: MESSAGES[known] }, { status: known === "NOT_ALLOWED" ? 403 : 409 });
  if (error.code === "42501") return NextResponse.json({ error: MESSAGES.NOT_ALLOWED }, { status: 403 });
  return NextResponse.json({ error: `${fallback} (${error.message})` }, { status: 500 });
}

/** Registers a new driver through register_driver() (any active user may). */
export async function registerDriver(
  supabase: Awaited<ReturnType<typeof createClient>>,
  d: { driver_name: string; driver_id_no: string; driver_cell: string },
): Promise<{ id: string } | { response: NextResponse }> {
  const { data, error } = await supabase.rpc("register_driver", {
    p_full_name: d.driver_name, p_id_no: d.driver_id_no, p_cell_no: normalisePhone(d.driver_cell),
  });
  if (error) return { response: dbErrorResponse(error, "The driver could not be saved.") };
  return { id: data as string };
}

export function badRequest(issues: { message: string }[]) {
  return NextResponse.json({ error: issues[0]?.message ?? "Check the form." }, { status: 400 });
}
