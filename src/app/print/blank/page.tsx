import { getProfile } from "@/lib/auth";
import { loadBlankForms } from "@/lib/print-data";
import { PrintDocument } from "@/components/print/print-document";
import { PrintToolbar } from "@/components/print/print-toolbar";

export default async function BlankPrintPage({ searchParams }: { searchParams: Promise<{ count?: string }> }) {
  const { count } = await searchParams;
  const n = Math.min(50, Math.max(1, Number.parseInt(count ?? "1", 10) || 1));
  const profile = await getProfile();
  const lists = await loadBlankForms(n);
  return (
    <>
      <PrintToolbar backHref={profile?.role === "admin" ? "/admin/blank-forms" : "/lists/blank-forms"} pages={lists.length} />
      <PrintDocument lists={lists} />
    </>
  );
}
