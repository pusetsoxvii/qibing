"use client";

import { useState } from "react";
import { Button, Card, Field } from "@/components/ui";

/** Choose how many blank passenger lists to print; numbering runs across the whole job. */
export function BlankFormsPicker() {
  const [count, setCount] = useState("1");
  const n = Number(count);
  const valid = Number.isInteger(n) && n >= 1 && n <= 50;
  return (
    <Card className="flex flex-col gap-4">
      <p>
        A blank form is the passenger list with your letterhead and all rows empty, for writing by hand when a phone
        can&apos;t be used. Each form prints as 1 page.
      </p>
      <Field label="How many forms?" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)}
        hint="1 to 50" error={count && !valid ? "Enter a number from 1 to 50" : undefined} />
      <Button type="button" disabled={!valid} onClick={() => window.location.assign(`/print/blank?count=${n}`)}>
        Open print preview
      </Button>
    </Card>
  );
}
