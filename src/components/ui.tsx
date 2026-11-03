import * as React from "react";
import { clsx } from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  block?: boolean;
};

export function Button({ variant = "primary", block, className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark active:bg-brand-dark",
        variant === "secondary" && "border-2 border-brand bg-white text-brand-dark hover:bg-brand-light",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
        variant === "ghost" && "text-brand-dark underline-offset-4 hover:underline",
        block && "w-full",
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({ variant = "primary", className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: "primary" | "secondary" }) {
  return (
    <a
      className={clsx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold",
        variant === "primary" ? "bg-brand text-white hover:bg-brand-dark" : "border-2 border-brand bg-white text-brand-dark hover:bg-brand-light",
        className,
      )}
      {...props}
    />
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered inside the right edge of the input, e.g. a show/hide button. */
  trailing?: React.ReactNode;
}

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, trailing, id, className, ...props }, ref) {
  const inputId = id ?? props.name;
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-base font-semibold">
        {label}
      </label>
      <div className="relative flex flex-col">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={clsx(
            "min-h-12 rounded-lg border-2 bg-white px-3 text-base",
            trailing && "pr-12",
            error ? "border-red-700" : "border-gray-300 focus:border-brand",
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-0.5">{trailing}</div>}
      </div>
      {hint && !error && <p className="text-sm text-gray-600">{hint}</p>}
      {error && (
        <p id={`${inputId}-error`} className="text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
});

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function SelectField({ label, error, hint, id, className, children, ...props }: SelectFieldProps) {
  const selectId = id ?? props.name;
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={selectId} className="text-base font-semibold">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={clsx("min-h-12 rounded-lg border-2 bg-white px-3 text-base", error ? "border-red-700" : "border-gray-300 focus:border-brand")}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <p className="text-sm text-gray-600">{hint}</p>}
      {error && (
        <p id={`${selectId}-error`} className="text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info" | "warning"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-lg border-l-4 px-4 py-3 text-base",
        tone === "error" && "border-red-700 bg-red-50 text-red-900",
        tone === "success" && "border-brand bg-brand-light text-brand-dark",
        tone === "info" && "border-gray-400 bg-card text-ink",
        tone === "warning" && "border-amber-600 bg-amber-50 text-amber-900",
      )}
    >
      {children}
    </div>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded-lg bg-card p-5", className)} {...props} />;
}

export function Badge({ tone, children }: { tone: "draft" | "closed" | "inactive" | "locked" | "admin"; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold",
        tone === "closed" && "bg-brand-light text-brand-dark",
        tone === "draft" && "bg-amber-100 text-amber-900",
        tone === "inactive" && "bg-gray-200 text-gray-800",
        tone === "locked" && "bg-red-100 text-red-900",
        tone === "admin" && "bg-[#F3E8DF] text-accent",
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mt-2 text-gray-700">{children}</div>}
    </div>
  );
}
