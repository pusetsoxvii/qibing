"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function NavLink({ href, exact, variant, children }: { href: string; exact?: boolean; variant: "side" | "tab" | "bottom"; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        variant === "side" && "flex min-h-12 items-center gap-3 rounded-lg px-3 font-semibold",
        variant === "side" && (active ? "bg-brand text-white" : "text-ink hover:bg-card"),
        variant === "tab" && "flex min-h-12 items-center whitespace-nowrap border-b-4 px-3 font-semibold",
        variant === "tab" && (active ? "border-brand text-brand-dark" : "border-transparent text-gray-700"),
        variant === "bottom" && "flex min-h-16 flex-col items-center justify-center gap-0.5 font-semibold",
        variant === "bottom" && (active ? "text-brand" : "text-gray-700"),
      )}
    >
      {children}
    </Link>
  );
}
