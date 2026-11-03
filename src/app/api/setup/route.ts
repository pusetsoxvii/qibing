import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/auth";
import { setupPayloadSchema } from "@/lib/schemas";
import { normalisePhone, formatPhone } from "@/lib/format";
import { adminExists, setupCodeMatches, slowDown } from "@/lib/setup-server";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "The form could not be read." }, { status: 400 });

  if (!setupCodeMatches(form.get("code"))) {
    await slowDown();
    return NextResponse.json({ error: "That setup code is not correct." }, { status: 403 });
  }
  if (await adminExists()) {
    return NextResponse.json({ error: "Setup is already complete.", complete: true }, { status: 409 });
  }

  let payload;
  try {
    payload = setupPayloadSchema.parse(JSON.parse(String(form.get("payload"))));
  } catch {
    return NextResponse.json({ error: "Some details are missing or not valid. Go back and check each step." }, { status: 400 });
  }

  const isImage = (f: FormDataEntryValue | null): f is File =>
    f instanceof File && ["image/png", "image/jpeg"].includes(f.type) && f.size > 0 && f.size <= MAX_LOGO_BYTES;
  const logo = form.get("logo");
  if (!isImage(logo)) {
    return NextResponse.json({ error: "Upload the letterhead logo as a PNG or JPG of 5 MB or less." }, { status: 400 });
  }
  const watermarkEntry = form.get("watermark");
  const watermark = watermarkEntry instanceof File && watermarkEntry.size > 0 ? watermarkEntry : null;
  if (watermark && !isImage(watermark)) {
    return NextResponse.json({ error: "Upload the watermark as a PNG or JPG of 5 MB or less." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Images. Each upload gets its own file name, so closed lists keep the images they were printed with.
  const uploaded: string[] = [];
  async function store(kind: string, file: File): Promise<string | null> {
    const path = `${kind}-${Date.now()}-${randomUUID().slice(0, 8)}.${file.type === "image/png" ? "png" : "jpg"}`;
    const res = await admin.storage.from("branding").upload(path, file, { contentType: file.type, upsert: false });
    if (res.error) return null;
    uploaded.push(path);
    return path;
  }
  const logoPath = await store("logo", logo);
  const watermarkPath = watermark ? await store("watermark", watermark) : null;
  if (!logoPath || (watermark && !watermarkPath)) {
    if (uploaded.length) await admin.storage.from("branding").remove(uploaded);
    return NextResponse.json({ error: "The images could not be saved. Check the storage bucket from the migrations exists." }, { status: 500 });
  }

  // 2. Auth user for the admin.
  const created = await admin.auth.admin.createUser({
    email: usernameToEmail(payload.account.username),
    password: payload.account.password,
    email_confirm: true,
    user_metadata: { username: payload.account.username },
  });
  if (created.error || !created.data.user) {
    await admin.storage.from("branding").remove(uploaded);
    const taken = created.error?.message?.toLowerCase().includes("already");
    return NextResponse.json(
      { error: taken ? "That username is already taken." : "The admin account could not be created. " + (created.error?.message ?? "") },
      { status: 400 },
    );
  }

  // 3. Everything else in one transaction. It refuses if an admin appeared meanwhile.
  const { error } = await admin.rpc("complete_setup", {
    p_user_id: created.data.user.id,
    p_full_name: payload.account.full_name,
    p_username: payload.account.username,
    p_settings: {
      ...payload.settings,
      cell_no: formatPhone(normalisePhone(payload.settings.cell_no) as string),
      logo_path: logoPath,
      watermark_path: watermarkPath,
      child_limit: payload.limits.child_limit,
    },
    p_committee: payload.committee,
    p_route: payload.route,
  });

  if (error) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    await admin.storage.from("branding").remove(uploaded);
    if (error.message.includes("SETUP_ALREADY_COMPLETE")) {
      return NextResponse.json({ error: "Setup is already complete.", complete: true }, { status: 409 });
    }
    return NextResponse.json({ error: "Setup could not be saved: " + error.message }, { status: 500 });
  }

  // A route from the home town to every town in the country. Setup has succeeded either way;
  // a failure here only means the routes are missing until the migration is run again.
  await admin.rpc("add_town_routes", { p_actor: created.data.user.id });

  return NextResponse.json({ ok: true });
}
