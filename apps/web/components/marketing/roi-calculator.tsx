"use client";

import { useId, useState } from "react";

/** The cited lift (Prada, Rucci & Urzúa 2019): 12.1% in daily sales. Applied as an illustration only. */
const LIFT = 0.121;

/**
 * "What 12% means for you": the visitor's own monthly sales, times the study's lift. Every word comes from the
 * server (copy.ts); this only does the arithmetic. The result is announced politely as it changes.
 */
export function RoiCalculator({ locale, title, label, result, perMonth, perYear, note, initial = 250000 }: {
  locale: string; title: string; label: string; result: string; perMonth: string; perYear: string; note: string; initial?: number;
}) {
  const id = useId();
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const plain = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const [raw, setRaw] = useState(plain.format(initial));
  const value = Number(raw.replace(/[^\d]/g, "")) || 0;
  const month = Math.round(value * LIFT);
  return (
    <div className="liquid-glass liquid-glass-panel mkt-card relative rounded-[1.75rem] p-5 sm:p-7" data-testid="roi-calculator">
      <h3 className="text-[19px] font-semibold tracking-tight text-ink">{title}</h3>
      <label htmlFor={`${id}-sales`} className="mt-5 block text-[14px] font-medium text-body">{label}</label>
      <div className="liquid-glass-field mt-2 flex min-h-[56px] items-center gap-2 rounded-[14px] px-4">
        <span className="text-[20px] font-semibold text-muted" aria-hidden="true">$</span>
        <input
          id={`${id}-sales`}
          inputMode="numeric"
          autoComplete="off"
          value={raw}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 12);
            setRaw(digits ? plain.format(Number(digits)) : "");
          }}
          className="min-w-0 flex-1 bg-transparent text-[22px] font-semibold text-ink tabular-nums outline-none"
          aria-describedby={`${id}-note`}
        />
      </div>
      <output htmlFor={`${id}-sales`} aria-live="polite" className="mt-6 block border-t border-[var(--border-soft)] pt-5">
        <span className="block text-[14px] text-muted">{result}</span>
        <span className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
          <span className="font-display text-[clamp(2.6rem,10vw,3.4rem)] leading-none text-ink tabular-nums" data-testid="roi-month">{money.format(month)}</span>
          <span className="text-[16px] font-medium text-body">{perMonth}</span>
        </span>
        <span className="mt-2 block text-[15px] font-medium text-[var(--accent)] tabular-nums">{perYear.replace("{x}", money.format(month * 12))}</span>
      </output>
      <p id={`${id}-note`} className="mt-5 text-[13px] leading-relaxed text-muted">{note}</p>
    </div>
  );
}
