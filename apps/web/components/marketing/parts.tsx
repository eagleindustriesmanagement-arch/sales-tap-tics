import Link from "next/link";
import type { ReactNode } from "react";

/** The primary call to action: the gold glass, with a light sweep on hover. */
export const goldButton =
  "liquid-glass liquid-glass-accent mkt-cta-gold inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 text-[16px] font-semibold tracking-[0.01em]";
/** The secondary: clear glass that picks up the light behind it. */
export const glassButton =
  "liquid-glass inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 text-[16px] font-semibold text-ink";

export function Arrow({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Eyebrow({ children, index }: { children: ReactNode; index?: string }) {
  return (
    <p className="mkt-eyebrow">
      {index && <span className="text-faint tabular-nums">{index}</span>}
      {children}
    </p>
  );
}

/** The logo mark and name. */
export function Brand({ label, size = 34 }: { label: string; size?: number }) {
  return (
    <Link href="/" aria-label={label} className="flex shrink-0 items-center gap-2.5 rounded-full pr-2 text-ink">
      <span className="bezel overflow-hidden rounded-[10px] ring-1 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]" style={{ width: size, height: size }}>
        <img src="/mark-128.png" alt="" width={size} height={size} />
      </span>
      <span className="text-[17px] font-semibold tracking-tight">Sales Taptics</span>
    </Link>
  );
}

/** A small ring drawn in SVG; it draws in when its reveal block arrives (marketing.css .mkt-ring-v). */
export function MiniRing({ value, size = 64, stroke = 6, ink, children }: { value: number; size?: number; stroke?: number; ink?: boolean; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const to = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} className="-rotate-90" focusable="false">
        <defs>
          <linearGradient id={`mkt-ring-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2deb6" />
            <stop offset="1" stopColor="#c49a5c" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ink ? "rgba(0, 0, 0, 0.16)" : "color-mix(in srgb, #fff 8%, transparent)"} strokeWidth={stroke} />
        <circle
          className="mkt-ring-v"
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={ink ? "var(--accent-fill-foreground)" : `url(#mkt-ring-${size})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={to}
          style={{ ["--full" as string]: `${c}`, ["--to" as string]: `${to}` }}
        />
      </svg>
      {children && <span className="absolute inset-0 grid place-items-center">{children}</span>}
    </span>
  );
}
