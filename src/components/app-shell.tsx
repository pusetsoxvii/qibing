import Link from "next/link";
import { Activity, FileText, LayoutDashboard, ListChecks, Users } from "lucide-react";
import { homeFor, type Profile } from "@/lib/auth";
import { getBranding, logoUrl } from "@/lib/branding";
import { t } from "@/lib/strings";
import { NavLink } from "./nav-link";

type NavItem = { href: string; label: string; icon: typeof FileText; exact?: boolean };

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/progress", label: "Marshal progress", icon: Activity },
  { href: "/lists", label: "Passenger lists", icon: ListChecks },
  { href: "/admin/marshals", label: "Marshals", icon: Users },
  { href: "/admin/blank-forms", label: "Blank forms", icon: FileText },
];

const MARSHAL_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lists", label: "Today's Lists", icon: ListChecks, exact: true },
  { href: "/lists/blank-forms", label: "Blank forms", icon: FileText },
];

export async function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const branding = await getBranding();
  const isAdmin = profile.role === "admin";
  const nav = isAdmin ? ADMIN_NAV : MARSHAL_NAV;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 bg-brand px-4 text-white">
        <Link href={homeFor(profile.role)} className="flex min-w-0 items-center gap-3">
          {branding.logo_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl(branding.logo_path)} alt="" className="h-11 w-11 rounded-full bg-white object-contain" />
          )}
          <span className="truncate text-base font-semibold">{branding.short_name}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/account" className="hidden max-w-[12rem] truncate text-base underline-offset-4 hover:underline sm:block">
            {profile.full_name}
          </Link>
          <Link href="/account" className="text-sm underline sm:hidden" aria-label={t.app.myAccount}>
            {t.app.myAccount}
          </Link>
          <form action="/api/auth/sign-out" method="post">
            <button className="min-h-11 rounded-lg border-2 border-white px-3 text-sm font-semibold hover:bg-brand-dark">
              {t.app.signOut}
            </button>
          </form>
        </div>
      </header>

      {isAdmin ? (
        <div className="flex">
          <nav className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col gap-1 border-r border-gray-200 p-3 md:flex">
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href} exact={item.exact} variant="side">
                <item.icon size={20} /> {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="min-w-0 flex-1">
            <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 px-2 md:hidden">
              {nav.map((item) => (
                <NavLink key={item.href} href={item.href} exact={item.exact} variant="tab">
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
          </div>
        </div>
      ) : (
        <>
          <main className="mx-auto max-w-xl px-4 pb-28 pt-4">{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-20 grid border-t border-gray-200 bg-white" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href} variant="bottom" exact>
                <item.icon size={24} />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
