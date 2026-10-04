import { t, type Bilingual, type Language } from "@taptics/i18n";
import { IconAlert, IconBulb, IconCheck, IconMessage, IconTarget, IconX } from "@/components/icons";
import { Card, quoted } from "@/components/ui";

/** What the rep reads before a scenario (decision 0031): the content file's lesson, both languages. */
export interface LessonView {
  title: Bilingual;
  hook: Bilingual;
  tactic: Bilingual | null;
  steps: Bilingual[];
  what: Bilingual;
  why: Bilingual;
  when: Bilingual;
  when_not: Bilingual;
  say: Bilingual[];
  mistakes: { mistake: Bilingual; fix: Bilingual }[];
  concepts: { name: Bilingual; idea: Bilingual }[];
}

const STEPS = ["learn", "see", "do", "scored"] as const;

/** Learn, see it, do it, get scored: where the rep is in the lesson's loop. */
export function LessonSteps({ current, lang }: { current: (typeof STEPS)[number]; lang: Language }) {
  const at = STEPS.indexOf(current);
  return (
    <ol className="flex items-center gap-1.5" aria-label={t("lesson.steps", lang)}>
      {STEPS.map((s, i) => (
        <li key={s} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={i === at ? "step" : undefined}>
          <span className={`h-1 rounded-full ${i < at ? "bg-brand/60" : i === at ? "fill-gold" : "bg-ground"}`} />
          <span className={`text-center text-[11px] leading-tight font-semibold tracking-wide uppercase ${i === at ? "text-brand" : "text-muted"}`}>{t(`lesson.step.${s}`, lang)}</span>
        </li>
      ))}
    </ol>
  );
}

/** The lesson itself: tight, scannable, in the voice of a floor trainer. */
export function Lesson({ lesson, lang }: { lesson: LessonView; lang: Language }) {
  const x = (b: Bilingual) => b[lang];
  return (
    <article className="space-y-5" data-testid="lesson">
      <header className="space-y-3">
        <p className="text-[13px] font-semibold tracking-[0.18em] text-brand uppercase">{t("lesson.eyebrow", lang)}</p>
        <h1 className="font-display text-[34px] leading-[1.05] text-ink sm:text-[42px]">{x(lesson.title)}</h1>
        <p className="font-display text-[21px] leading-snug text-body italic">{x(lesson.hook)}</p>
      </header>

      {/* First the tactic in plain words, then what to do, in order: the lesson must be clear in ten seconds. */}
      {lesson.tactic ? (
        <section className="liquid-glass liquid-glass-panel liquid-glass-hero space-y-4 rounded-[1.5rem] p-5" data-testid="lesson-tactic">
          <div className="space-y-1.5">
            <h2 className="text-[13px] font-semibold tracking-[0.14em] text-brand uppercase">{t("lesson.tactic", lang)}</h2>
            <p className="text-[19px] leading-snug font-semibold text-ink">{x(lesson.tactic)}</p>
          </div>
          {lesson.steps.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[13px] font-semibold tracking-[0.14em] text-muted uppercase">{t("lesson.doThis", lang)}</h2>
              <ol className="space-y-2" data-testid="lesson-steps">
                {lesson.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[14px] font-bold text-brand ring-1 ring-brand/25 ring-inset">{i + 1}</span>
                    <span className="pt-0.5 text-[16px] leading-snug text-ink">{x(s)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      ) : (
        <Card className="space-y-2">
          <h2 className="text-[13px] font-semibold tracking-[0.14em] text-muted uppercase">{t("lesson.what", lang)}</h2>
          <p className="text-[17px] leading-relaxed text-ink">{x(lesson.what)}</p>
        </Card>
      )}

      <section className="space-y-2.5">
        <h2 className="flex items-center gap-2 px-1 font-display text-[24px] text-ink"><IconMessage size={20} className="text-brand" />{t("lesson.say", lang)}</h2>
        <ul className="space-y-2">
          {lesson.say.map((s, i) => (
            <li key={i} className="rounded-[1rem] border-l-2 border-brand bg-ground px-4 py-3 text-[16px] leading-snug text-ink">{quoted(x(s))}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2.5">
        <h2 className="flex items-center gap-2 px-1 font-display text-[24px] text-ink"><IconAlert size={20} className="text-bad" />{t("lesson.mistakes", lang)}</h2>
        <ul className="space-y-2">
          {lesson.mistakes.map((m, i) => (
            <li key={i}>
              <Card className="space-y-1.5">
                <p className="flex gap-2 text-[15px] text-ink"><IconX size={18} className="mt-0.5 shrink-0 text-bad" /><span>{x(m.mistake)}</span></p>
                <p className="flex gap-2 text-[15px] text-body"><IconCheck size={18} className="mt-0.5 shrink-0 text-good" /><span>{x(m.fix)}</span></p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* The background, for whoever wants it: closed by default so the tactic and the steps stay in front. */}
      <details className="liquid-glass liquid-glass-panel group rounded-[1.25rem] p-4" data-testid="lesson-more">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-semibold text-ink">
          {t("lesson.more", lang)}
          <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-3 space-y-4">
          {lesson.tactic && (
            <div className="space-y-1">
              <h3 className="text-[13px] font-semibold tracking-[0.14em] text-muted uppercase">{t("lesson.what", lang)}</h3>
              <p className="text-[16px] leading-relaxed text-body">{x(lesson.what)}</p>
            </div>
          )}
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.14em] text-brand uppercase"><IconBulb size={16} />{t("lesson.why", lang)}</h3>
            <p className="text-[16px] leading-relaxed text-body">{x(lesson.why)}</p>
          </div>
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.14em] text-good uppercase"><IconCheck size={16} />{t("lesson.when", lang)}</h3>
            <p className="text-[15px] leading-relaxed text-body">{x(lesson.when)}</p>
          </div>
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.14em] text-warn uppercase"><IconX size={16} />{t("lesson.whenNot", lang)}</h3>
            <p className="text-[15px] leading-relaxed text-body">{x(lesson.when_not)}</p>
          </div>
        </div>
      </details>

      <section className="space-y-2.5">
        <h2 className="flex items-center gap-2 px-1 font-display text-[24px] text-ink"><IconTarget size={20} className="text-brand" />{t("lesson.concepts", lang)}</h2>
        <ol className="space-y-2">
          {lesson.concepts.map((c, i) => (
            <li key={i} className="flex gap-3 rounded-[1rem] px-1 py-1.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[14px] font-bold text-brand ring-1 ring-brand/25 ring-inset">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold text-ink">{x(c.name)}</span>
                <span className="block text-[15px] text-body">{x(c.idea)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
