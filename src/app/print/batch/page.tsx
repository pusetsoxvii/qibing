import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { loadTrips } from "@/lib/print-data";
import { PrintDocument } from "@/components/print/print-document";
import { PrintToolbar } from "@/components/print/print-toolbar";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Several lists in one print job: /print/batch?ids=a,b,c (max 50). Numbering continues across the job. */
export default async function BatchPrintPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireProfile({ role: "admin" });
  const { ids } = await searchParams;
  const list = (ids ?? "").split(",").filter((x) => UUID.test(x)).slice(0, 50);
  if (list.length === 0) notFound();
  const lists = await loadTrips(list);
  if (lists.length === 0) notFound();
  return (
    <>
      <PrintToolbar backHref="/admin" pages={lists.length} />
      <PrintDocument lists={lists} />
    </>
  );
}
