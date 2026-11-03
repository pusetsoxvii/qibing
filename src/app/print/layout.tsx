import { requireProfile } from "@/lib/auth";
import "./print.css";

export const dynamic = "force-dynamic";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireProfile();
  return <div className="qb-preview">{children}</div>;
}
