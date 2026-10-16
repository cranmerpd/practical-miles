import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const field =
  "min-h-11 w-full rounded-md border border-ink/15 bg-sheet px-3 text-base text-ink outline-none placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-rust";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, className)} {...props} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}
