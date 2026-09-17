import type { InputHTMLAttributes, LabelHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-[var(--rule)] bg-white px-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-2 focus-visible:outline-[var(--green)]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1 block text-[12.5px] font-semibold text-[var(--muted)]",
        className,
      )}
      {...props}
    />
  );
}
