import { BlankFormsPicker } from "@/components/blank-forms-picker";

export default function AdminBlankFormsPage() {
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <h1 className="text-2xl">Blank forms</h1>
      <BlankFormsPicker />
    </div>
  );
}
