import type { HTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & Omit<HTMLAttributes<HTMLElement>, "className" | "children">) {
  return <section {...rest} className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function Grade({ grade, label }: { grade: string; label: string }) {
  const tone = grade === "A" ? "bg-good text-white" : grade === "B" ? "bg-brand text-brand-ink" : grade === "C" ? "bg-warn text-white" : "bg-line text-ink";
  return (
    <span title={label} className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-bold ${tone}`}>
      {grade}
    </span>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">{children}</span>;
}

export const buttonClass = "inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 text-base font-semibold text-brand-ink transition hover:opacity-90 disabled:opacity-50";
export const ghostButtonClass = "inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-5 text-base font-semibold text-ink transition hover:bg-ground disabled:opacity-50";
