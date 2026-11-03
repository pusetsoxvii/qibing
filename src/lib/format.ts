/** All dates are shown in South African time, whatever the device or server time zone. */
export const TIME_ZONE = "Africa/Johannesburg";

/** Today's date in SAST as yyyy-mm-dd. */
export function todaySast(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** yyyy-mm-dd (or a timestamp) → dd/mm/yyyy */
export function formatDate(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${formatDate(date)} ${time}`;
}

const randFormatter = new Intl.NumberFormat("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Integer cents → "R1 500.00" */
export function formatRand(cents: number): string {
  return `R${randFormatter.format(cents / 100).replace(/ /g, " ").replace(",", ".")}`;
}

/**
 * Accepts any phone number: 3 to 15 digits, optionally starting with +
 * (spaces, dashes and brackets allowed). South African numbers (0xx xxx xxxx or
 * +27 xx xxx xxxx) are stored as +27xxxxxxxxx so the same number always matches;
 * any other number is stored as its digits. Returns null when it is not a number.
 */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "");
  if (/^0[1-8]\d{8}$/.test(digits)) return `+27${digits.slice(1)}`;
  if (/^\+?27[1-8]\d{8}$/.test(digits)) return `+${digits.replace(/^\+/, "")}`;
  return /^\+?\d{3,15}$/.test(digits) ? digits : null;
}

/** +27xxxxxxxxx → 0xx xxx xxxx */
export function formatPhone(stored: string): string {
  const m = /^\+27(\d{2})(\d{3})(\d{4})$/.exec(stored);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : stored;
}

export function minutesUntil(iso: string): number {
  return Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
}
