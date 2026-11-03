import { z } from "zod";
import { normalisePhone } from "@/lib/format";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9.]{3,30}$/, "Use 3 to 30 letters, numbers or dots");

export const fullNameSchema = z.string().trim().min(2, "Enter the full name").max(120, "Too long");

export const pinSchema = z.string().regex(/^\d{6,8}$/, "The PIN must be 6 to 8 digits");
export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72, "Too long");

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => normalisePhone(v) !== null, "Enter a phone number (digits only, + allowed)")
  .transform((v) => normalisePhone(v) as string);

export const signInSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Enter your username"),
  secret: z.string().min(1, "Enter your PIN or password"),
});

export const settingsSchema = z.object({
  association_name: z.string().trim().min(2, "Required").max(120),
  short_name: z.string().trim().min(2, "Required").max(60),
  street_address: z.string().trim().min(2, "Required").max(120),
  town: z.string().trim().min(2, "Required").max(80),
  postal_code: z.string().trim().regex(/^\d{4}$/, "Four digits"),
  cell_no: z.string().trim().refine((v) => normalisePhone(v) !== null, "Enter a phone number (digits only, + allowed)"),
  email: z.string().trim().email("Enter a valid email address"),
  registration_no: z.string().trim().min(2, "Required").max(60),
  chairperson_line: z.string().trim().min(2, "Required").max(120),
  secretary_line: z.string().trim().min(2, "Required").max(120),
  paper_size: z.enum(["letter", "a4"]),
});

export const committeeSchema = z
  .array(z.object({ role_title: z.string().trim().min(2, "Required").max(60), name: z.string().trim().min(2, "Required").max(120) }))
  .min(1, "Add at least one committee member");

export const routeSchema = z.object({
  name: z.string().trim().min(2, "Required").max(120),
  from_place: z.string().trim().min(2, "Required").max(80),
  to_place: z.string().trim().min(2, "Required").max(80),
});

export const limitsSchema = z.object({
  child_limit: z.coerce.number().int().min(0, "0 or more").max(3, "The form has 3 child rows"),
});

export const adminAccountSchema = z
  .object({
    full_name: fullNameSchema,
    username: usernameSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords do not match" });

export const setupPayloadSchema = z.object({
  account: adminAccountSchema,
  settings: settingsSchema,
  committee: committeeSchema,
  route: routeSchema,
  limits: limitsSchema,
});
export type SetupPayload = z.infer<typeof setupPayloadSchema>;

export const createMarshalSchema = z.object({
  full_name: fullNameSchema,
  username: usernameSchema,
  pin: pinSchema,
});

const uuidOrNew = (message: string, alsoLater = false) =>
  z.string().refine((v) => v === "new" || (alsoLater && v === "later") || z.uuid().safeParse(v).success, message);
const text = (min: number, max: number, message: string) => z.string().trim().min(min, message).max(max, "Too long");

/**
 * Starting a list. Vehicle and driver are either picked ("<uuid>") or added on the spot ("new").
 * The driver may also be left for later ("later"): the list is saved and the driver set before closing.
 */
export const newTripSchema = z
  .object({
    trip_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    route_id: z.uuid("Choose a route"),
    vehicle_id: uuidOrNew("Choose a vehicle"),
    registration_no: z.string().transform((v) => v.replace(/[\s-]/g, "").toUpperCase()),
    owner_title: z.enum(["Mr", "Mrs", "Ms", "none"]),
    owner_name: z.string().trim(),
    driver_id: uuidOrNew("Choose a driver", true),
    driver_name: z.string().trim(),
    driver_id_no: z.string().trim(),
    driver_cell: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (v.vehicle_id === "new") {
      if (!/^[A-Z0-9]{2,12}$/.test(v.registration_no)) issue("registration_no", "Letters and numbers only, e.g. ABC123FS");
      if (v.owner_name.length < 2 || v.owner_name.length > 120) issue("owner_name", "Enter the owner's name");
    }
    if (v.driver_id === "new") {
      if (v.driver_name.length < 2 || v.driver_name.length > 120) issue("driver_name", "Enter the full name");
      if (v.driver_id_no.length < 4 || v.driver_id_no.length > 30) issue("driver_id_no", "4 to 30 characters");
      if (normalisePhone(v.driver_cell) === null) issue("driver_cell", "Enter a phone number (digits only, + allowed)");
    }
  });
export type NewTrip = z.input<typeof newTripSchema>;

/** Setting the driver on a list that was saved without one. Same rules as on the start form. */
export const setDriverSchema = z
  .object({
    driver_id: uuidOrNew("Choose a driver"),
    driver_name: z.string().trim(),
    driver_id_no: z.string().trim(),
    driver_cell: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.driver_id !== "new") return;
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (v.driver_name.length < 2 || v.driver_name.length > 120) issue("driver_name", "Enter the full name");
    if (v.driver_id_no.length < 4 || v.driver_id_no.length > 30) issue("driver_id_no", "4 to 30 characters");
    if (normalisePhone(v.driver_cell) === null) issue("driver_cell", "Enter a phone number (digits only, + allowed)");
  });
export type SetDriver = z.input<typeof setDriverSchema>;

/** Rand as typed ("350", "350.50" or "350,50") → integer cents. */
export const randSchema = z
  .string()
  .trim()
  .regex(/^\d{1,4}([.,]\d{1,2})?$/, "Enter an amount like 350 or 350.50")
  .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
  .refine((c) => c <= 500000, "At most R5 000");

/** One passenger on a list. `id` is made on the phone so a retried save never adds the person twice. */
export const tripPassengerSchema = z.object({
  id: z.uuid(),
  passenger_id: z.union([z.uuid(), z.literal("")]),
  full_name: fullNameSchema,
  from_address: text(2, 120, "Enter where they are picked up"),
  destination_address: text(2, 120, "Enter where they are going"),
  next_of_kin_no: phoneSchema,
  paid: randSchema,
  is_child: z.boolean(),
});
export type TripPassengerInput = z.input<typeof tripPassengerSchema>;

export const reopenSchema = z.object({ reason: text(5, 300, "Give a reason of at least 5 characters") });

export function newSecretSchema(role: "admin" | "marshal") {
  return z
    .object({ current: z.string().min(1, "Enter your current " + (role === "admin" ? "password" : "PIN")), next: role === "admin" ? passwordSchema : pinSchema, confirm: z.string() })
    .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "They do not match" })
    .refine((v) => v.next !== v.current, { path: ["next"], message: "Choose a different one from your current one" });
}
