import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

/**
 * The building blocks every screen uses (docs/DESIGN-GUIDELINES.md). The material classes come from
 * globals.css; never put a bg-* or border-* utility on an element that carries one (LIQUID-GLASS §5.2).
 */

type Tone = "brand" | "good" | "warn" | "bad" | "spark" | "neutral";

/** A card: the panel material, 20px radius. */
export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & Omit<HTMLAttributes<HTMLElement>, "className" | "children">) {
  return <section {...rest} className={`liquid-glass liquid-glass-panel rounded-[1.25rem] p-4 sm:p-5 ${className}`}>{children}</section>;
}

/** A sunk area inside a card: a quote, a model line, a hint. */
export function Inset({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`liquid-glass-inset rounded-[0.875rem] p-3 text-ink ${className}`}>{children}</div>;
}

/** Page title with an optional back link and one line of context. */
export function PageHeader({ title, subtitle, back, action }: { title: ReactNode; subtitle?: ReactNode; back?: { href: string; label: string }; action?: ReactNode }) {
  return (
    <header className="space-y-1">
      {back && (
        <Link href={back.href} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full pr-3 pl-1 text-[15px] font-semibold text-brand">
          <IconChevronLeft size={20} /> {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink sm:text-[32px]">{title}</h1>
        {action}
      </div>
      {subtitle && <p className="text-[15px] text-muted">{subtitle}</p>}
    </header>
  );
}

/** A section heading inside a page: sentence case, no eyebrow labels (guidelines §4). */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <h2 className="text-[19px] font-bold text-ink">{children}</h2>
      {action}
    </div>
  );
}

const toneText: Record<Tone, string> = { brand: "text-brand", good: "text-good", warn: "text-warn", bad: "text-bad", spark: "text-ink", neutral: "text-muted" };
const toneSoft: Record<Tone, string> = { brand: "bg-brand-soft text-brand", good: "bg-good-soft text-good", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", spark: "bg-spark-soft text-ink", neutral: "bg-ground text-muted" };
const toneStroke: Record<Tone, string> = { brand: "var(--accent)", good: "var(--success)", warn: "var(--warning)", bad: "var(--danger)", spark: "var(--spark)", neutral: "var(--muted)" };

/** A small status chip. Tinted fill, never a material (it keeps its own colour). */
export function Chip({ children, tone = "neutral", icon, className = "", ...rest }: { children: ReactNode; tone?: Tone; icon?: ReactNode; className?: string } & Omit<HTMLAttributes<HTMLSpanElement>, "className" | "children">) {
  return (
    <span {...rest} className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold ${toneSoft[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

/** Kept for older call sites: a quiet outline chip. */
export function Pill({ children }: { children: ReactNode }) {
  return <Chip>{children}</Chip>;
}

/** Evidence grade badge (A strongest). */
export function Grade({ grade, label }: { grade: string; label: string }) {
  const tone = grade === "A" ? "bg-good text-surface" : grade === "B" ? "bg-brand-fill text-brand-fill-ink" : grade === "C" ? "bg-warn text-surface" : "bg-ground text-ink";
  return (
    <span title={label} aria-label={label} className={`bezel inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-bold ${tone}`}>
      {grade}
    </span>
  );
}

/** A progress ring with its value drawn in. `value` is 0 to 1. */
export function Ring({ value, size = 64, stroke = 7, tone = "brand", children, label }: { value: number; size?: number; stroke?: number; tone?: Tone; children?: ReactNode; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role={label ? "img" : undefined} aria-label={label}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={toneStroke[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ ["--ring-full" as string]: `${c}` }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}

/** A horizontal bar. `value` is 0 to 1. */
export function Bar({ value, tone = "brand", className = "" }: { value: number; tone?: Tone; className?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-ground ${className}`} aria-hidden="true">
      <div className="bar-value h-full rounded-full" style={{ width: `${Math.round(v * 100)}%`, background: toneStroke[tone] }} />
    </div>
  );
}

/** Initials in a tinted circle; the hue follows the name so a person keeps their colour. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span
      aria-hidden="true"
      className="bezel inline-grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(145deg, hsl(${h} 58% 46%), hsl(${(h + 28) % 360} 62% 34%))` }}
    >
      {initials}
    </span>
  );
}

/** A tappable row: leading visual, two lines, trailing value, chevron. 64px tall. */
export function ListRow({ href, leading, title, subtitle, trailing, testId }: { href: string; leading?: ReactNode; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; testId?: string }) {
  return (
    <Link href={href} data-testid={testId} className="flex min-h-16 items-center gap-3 px-4 py-2.5 transition-colors active:bg-ground">
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold text-ink">{title}</span>
        {subtitle && <span className="block text-[14px] text-muted">{subtitle}</span>}
      </span>
      {trailing}
      <IconChevronRight size={18} className="shrink-0 text-faint" />
    </Link>
  );
}

/** A group of rows on one panel, separated by hairlines (the iOS inset-grouped list). */
export function RowGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`liquid-glass liquid-glass-panel divide-y divide-line-soft overflow-hidden rounded-[1.25rem] ${className}`}>{children}</div>;
}

/** A number with its label: the number is the loudest thing (BookFlows §8, Priya). */
export function Stat({ label, value, tone, testId, icon }: { label: string; value: ReactNode; tone?: Tone; testId?: string; icon?: ReactNode }) {
  return (
    <Card className="p-3.5 sm:p-4">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted">{icon}{label}</div>
      <p className={`mt-1 text-[26px] leading-none font-bold tabular-nums ${tone ? toneText[tone] : "text-ink"}`} data-testid={testId}>{value}</p>
    </Card>
  );
}

/** An empty state names the next action, never a mood (guidelines §7). */
export function Empty({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      {icon && <span className="grid h-12 w-12 place-items-center rounded-full bg-ground text-muted">{icon}</span>}
      <p className="max-w-xs text-[15px] text-muted">{children}</p>
      {action}
    </div>
  );
}

/** A session's score: tinted by how it went, an asterisk when the offline judge scored only part of it. */
export function ScoreBadge({ total, partial }: { total: number | null; partial?: boolean | null }) {
  if (total === null) return <span className="text-[15px] font-semibold text-faint">—</span>;
  const v = Math.round(total);
  const tone = partial ? "bg-ground text-ink" : v >= 70 ? "bg-good-soft text-good" : v >= 50 ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad";
  return <span className={`inline-flex min-w-11 justify-center rounded-full px-2.5 py-1 text-[15px] font-bold tabular-nums ${tone}`}>{v}{partial ? "*" : ""}</span>;
}

/** Primary: the accent glass pill. Secondary: neutral glass. Both 52px, thumb-sized. */
export const buttonClass = "liquid-glass liquid-glass-accent inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-6 text-[17px] font-semibold";
export const ghostButtonClass = "liquid-glass liquid-glass-flat inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-6 text-[17px] font-semibold text-ink";
export const smallButtonClass = "liquid-glass liquid-glass-flat inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-ink";
export const fieldClass = "liquid-glass-field min-h-12 w-full rounded-[0.875rem] px-3.5 text-ink";
export const linkClass = "font-semibold text-brand";
