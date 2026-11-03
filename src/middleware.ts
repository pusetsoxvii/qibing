import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SESSION_HOURS, SIGNIN_COOKIE } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/setup", "/api/setup", "/api/auth/sign-in", "/api/auth/sign-out"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (data.user) {
    const signedInAt = Number(request.cookies.get(SIGNIN_COOKIE)?.value ?? 0);
    const expired = !signedInAt || Date.now() - signedInAt > SESSION_HOURS * 3600 * 1000;
    if (expired && !path.startsWith("/api/auth/")) {
      await supabase.auth.signOut();
      const url = new URL("/login", request.url);
      url.searchParams.set("reason", "expired");
      const redirect = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      redirect.cookies.delete(SIGNIN_COOKIE);
      return redirect;
    }
  } else if (!isPublic) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/|icons/|manifest.webmanifest).*)"],
};
