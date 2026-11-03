"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field } from "@/components/ui";

type PasswordFieldProps = Omit<React.ComponentProps<typeof Field>, "type" | "trailing"> & {
  /** What the toggle's screen-reader label calls the value, e.g. "PIN" or "password". */
  noun?: string;
};

/** A password input with an eye button to show or hide what was typed. */
export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField({ noun = "password", ...props }, ref) {
  const [show, setShow] = React.useState(false);
  return (
    <Field
      ref={ref}
      type={show ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="flex h-11 w-11 items-center justify-center text-gray-700"
          aria-label={show ? `Hide ${noun}` : `Show ${noun}`}
          aria-pressed={show}
        >
          {show ? <EyeOff size={22} /> : <Eye size={22} />}
        </button>
      }
      {...props}
    />
  );
});
