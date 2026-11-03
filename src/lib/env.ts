function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example and the README.`);
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  setupCode: () => required("SETUP_CODE", process.env.SETUP_CODE),
  internalEmailDomain: () => process.env.INTERNAL_EMAIL_DOMAIN || "users.qibing.internal",
};

/** Hours a sign-in lasts before the person must sign in again. */
export const SESSION_HOURS = 12;
export const SIGNIN_COOKIE = "qb_signin_at";
