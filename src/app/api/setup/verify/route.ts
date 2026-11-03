import { NextResponse } from "next/server";
import { adminExists, setupCodeMatches, slowDown } from "@/lib/setup-server";

export async function POST(request: Request) {
  if (await adminExists()) {
    return NextResponse.json({ error: "Setup is already complete.", complete: true }, { status: 409 });
  }
  const body = await request.json().catch(() => ({}));
  if (!setupCodeMatches(body.code)) {
    await slowDown();
    return NextResponse.json({ error: "That setup code is not correct." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
