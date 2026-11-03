import { notFound } from "next/navigation";
import { loadTrips } from "@/lib/print-data";
import { PrintDocument } from "@/components/print/print-document";
import { PrintToolbar } from "@/components/print/print-toolbar";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TripPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const lists = await loadTrips([id]);
  if (lists.length === 0) notFound();
  return (
    <>
      <PrintToolbar backHref={`/lists/${id}`} pages={1} />
      <PrintDocument lists={lists} />
    </>
  );
}
