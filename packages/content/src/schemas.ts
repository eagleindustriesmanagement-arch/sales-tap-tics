import { z } from "zod";

/** Both languages, both non-empty (spec 1.2 item 3, 6.4 rule 5). */
export const bilingual = z.object({ en: z.string().trim().min(1), es: z.string().trim().min(1) }).strict();
export type BilingualText = z.infer<typeof bilingual>;

/** Bilingual lists, used for recognition cues; each side may differ in length. */
export const bilingualList = z.object({ en: z.array(z.string().min(1)), es: z.array(z.string().min(1)) }).strict();

/**
 * Allows one side of a bilingual pair to be empty only when the item is marked language specific with a reason
 * (spec 6.4 rule 5, for example a Spanish-only objection such as "Mi hijo me traduce").
 */
export const languageSpecific = z
  .object({ language: z.enum(["en", "es"]), reason: z.string().min(1) })
  .strict();
const maybeBilingual = z.object({ en: z.string().trim(), es: z.string().trim() }).strict();

export const evidenceGrade = z.enum(["A", "B", "C", "D"]);
export type EvidenceGrade = z.infer<typeof evidenceGrade>;

export const evidence = z
  .object({ grade: evidenceGrade, note: z.string().trim().min(1) })
  .strict();

export const severity = z.enum(["critical", "major", "minor"]);
export type Severity = z.infer<typeof severity>;

export const channel = z.enum(["floor", "phone", "text"]);
export type Channel = z.infer<typeof channel>;

export const speakerRole = z.enum(["rep", "customer", "demonstrator", "debrief"]);
export type SpeakerRole = z.infer<typeof speakerRole>;

const techniqueCode = z.string().regex(/^T\d{3}$/);
const objectionCode = z.string().regex(/^O\d{2}$/);
const ruleCode = z.string().regex(/^[A-Z]+-\d{2}$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const cents = z.number().int();

// ---------------------------------------------------------------- techniques (spec 7.2, 8)

export const techniqueFamily = z.enum([
  "objection_sequence",
  "discovery",
  "closing",
  "negotiation",
  "indecision",
  "phone",
  "finance_handoff",
  "delivery",
  "follow_up",
  "language_trust",
  "ev",
  "compliance",
]);
export type TechniqueFamily = z.infer<typeof techniqueFamily>;

export const techniqueSchema = z
  .object({
    code: techniqueCode,
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: bilingual,
    family: techniqueFamily,
    stages: z.array(z.string().min(1)).min(1),
    when: bilingual,
    /** "spoken" lines are said aloud; "direction" lines describe a behavior such as silence. */
    model_line_kind: z.enum(["spoken", "direction"]).default("spoken"),
    model_line: bilingual,
    /** Written by content editors per the family pattern in spec 8.12. Null until written. */
    flawed_line: bilingual.nullable().default(null),
    /** Rules the flawed line breaks on purpose, only in compliance lessons (spec 8.1 item 1, 8.12). */
    flawed_line_violates: z.array(ruleCode).default([]),
    /** Why it matters; shown in debriefs. Null until written; required for scenario target techniques. */
    why: bilingual.nullable().default(null),
    evidence,
    sources: z.array(z.string().min(1)).default([]),
    placeholders: z.array(z.string().regex(/^[A-Z]$/)).default([]),
    related: z.array(techniqueCode).default([]),
    rubric_items: z.array(z.string().min(1)).default([]),
    compliance: z.array(ruleCode).default([]),
    requires_store_policy: z.boolean().default(false),
    /** Honest-use condition the library must show, for example "Only when true". */
    use_only_when: bilingual.nullable().default(null),
    spanish_reviewed: z.boolean().default(false),
    status: z.enum(["active", "retired", "needs_store_policy"]).default("active"),
  })
  .strict();
export type Technique = z.infer<typeof techniqueSchema>;

// ---------------------------------------------------------------- objections (spec 9)

export const objectionSchema = z
  .object({
    code: objectionCode,
    slug: z.string().regex(/^[a-z0-9-]+$/),
    module: z.string().min(1),
    says: maybeBilingual,
    /** True when the customer says nothing (no-show, silence); `says` then describes the behavior. */
    nonverbal: z.boolean().default(false),
    behind: bilingual,
    behind_source: z.string().nullable().default(null),
    core_moves: z
      .object({
        techniques: z.array(techniqueCode).default([]),
        rules: z.array(ruleCode).default([]),
        notes: bilingual.nullable().default(null),
      })
      .strict(),
    release_1: z.boolean(),
    frequency_weight: z.number().positive().default(1),
    see_also: z.array(objectionCode).default([]),
    language_specific: languageSpecific.nullable().default(null),
    spanish_reviewed: z.boolean().default(false),
    status: z.enum(["active", "retired"]).default("active"),
  })
  .strict()
  .superRefine((o, ctx) => {
    for (const lang of ["en", "es"] as const) {
      if (o.says[lang] === "" && o.language_specific?.language !== (lang === "en" ? "es" : "en")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["says", lang], message: "empty without language_specific" });
      }
    }
  });
export type Objection = z.infer<typeof objectionSchema>;

// ---------------------------------------------------------------- personas (spec 10.1)

export const temperament = z.enum([
  "friendly",
  "guarded",
  "rushed",
  "analytical",
  "irritated",
  "theatrical",
  "skeptical",
  "aggressive",
  "anxious",
  "warm",
  "quiet",
]);

/** A rep behavior the engine recognizes, with example cues per language for the fast detector. */
export const behaviorCondition = z
  .object({
    code: z.string().regex(/^[a-z0-9_]+$/),
    description: bilingual,
    /** Case-insensitive regular expressions. The classifier judges meaning; cues are the deterministic fallback. */
    cues: bilingualList,
    /** Fires only after this many separate rep turns hit it ("a third push after two refusals"). */
    min_hits: z.number().int().min(1).default(1),
  })
  .strict();
export type BehaviorCondition = z.infer<typeof behaviorCondition>;

export const personaSchema = z
  .object({
    code: z.string().regex(/^P-[a-z0-9-]+$/),
    name_pool: bilingualList,
    age_range: z.string().regex(/^\d{2}-\d{2}$/),
    temperament: z.array(temperament).min(1),
    temperament_note: bilingual,
    buyer_orientation: z.enum(["task", "relationship", "self"]),
    situation: bilingual,
    stated_objection: objectionCode,
    stated_line: bilingual,
    hidden_truth: bilingual,
    /** Phrases that would reveal the hidden truth; used to stop leaks before an unlock (spec 21.3 item 3). */
    hidden_truth_markers: bilingualList,
    unlock_conditions: z.array(behaviorCondition).min(1),
    walk_out_triggers: z.array(behaviorCondition).min(1),
    win_condition: z
      .object({
        description: bilingual,
        /** Engine facts that must all hold: hidden_revealed, next_step, sale, partner_call. */
        requires_all: z.array(z.enum(["hidden_revealed", "next_step", "sale", "partner_call"])).min(1),
        /** Alternatives: any one of these also satisfies the outcome part. */
        requires_any: z.array(z.enum(["next_step", "sale", "partner_call"])).default([]),
      })
      .strict(),
    language: z
      .object({
        preferred: z.enum(["en", "es"]),
        mixes_when_rep_mixes: z.boolean(),
        everyday_terms: z.array(z.string()).default([]),
      })
      .strict(),
    register: z.enum(["usted", "tu"]).default("usted"),
    voice_ids: z.object({ en: z.string().min(1), es: z.string().min(1) }).strict(),
    difficulty: z.number().int().min(1).max(3),
    /** Surface details varied per run from the session seed (spec 10.3 item 6). */
    variation: z
      .object({
        moods: z.array(z.string()).default([]),
        amount_ranges: z.record(z.string(), z.tuple([cents, cents])).default({}),
      })
      .strict()
      .default({}),
    spanish_reviewed: z.boolean().default(false),
  })
  .strict();
export type Persona = z.infer<typeof personaSchema>;

// ---------------------------------------------------------------- scenarios (spec 7.3)

export const lenderState = z.enum(["not_applied", "pending", "approved", "declined"]);

export const factsSchema = z
  .object({
    /** The scenario clock: "today" for deadline checks, so a scenario replays identically. */
    session_date: isoDate,
    vehicle: z
      .object({
        year: z.number().int(),
        make: z.string(),
        model: z.string(),
        trim: z.string(),
        color: z.string().optional(),
        stock: z.string(),
        in_stock: z.boolean(),
        in_transit: z.boolean().default(false),
      })
      .strict(),
    price_cents: cents,
    dealer_fees: z.array(z.object({ code: z.string(), cents }).strict()),
    government_charges_customer_pays: z.array(z.string()),
    all_in_price_cents: cents,
    rebates: z
      .array(
        z
          .object({
            code: z.string(),
            name: z.string(),
            cents,
            eligibility: z.enum(["everyone", "qualifying"]),
            qualifies: z.string().optional(),
            ends: isoDate,
            proof: z.string().min(1),
          })
          .strict(),
      )
      .default([]),
    deadlines: z.array(z.object({ what: z.string(), date: isoDate, proof: z.string().min(1) }).strict()).default([]),
    inventory_same_trim_color: z.number().int().min(0),
    competing_buyer: z.boolean().default(false),
    /** Other real vehicles the rep may quote (a takeaway to a lower trim, T021), with their own all-in prices. */
    alternatives: z
      .array(z.object({ description: z.string(), all_in_price_cents: cents }).strict())
      .default([]),
    trade: z
      .object({
        vehicle: z.string(),
        appraisal_cents: cents.nullable(),
        payoff_cents: cents.nullable(),
        basis: z.string().optional(),
        conditions: z.array(z.string()).default([]),
      })
      .strict()
      .nullable(),
    lender_state: lenderState,
    approved_apr_bps: z.number().int().nullable().default(null),
    add_ons: z
      .array(
        z
          .object({
            code: z.string(),
            name: bilingual,
            cents,
            preinstalled: z.boolean().default(false),
            aliases: bilingualList.optional(),
          })
          .strict(),
      )
      .default([]),
    payment_options: z
      .array(
        z
          .object({
            code: z.string(),
            cents,
            term_months: z.number().int().positive(),
            apr_bps: z.number().int().nullable().default(null),
            down_cents: cents.default(0),
            includes_add_ons: z.array(z.string()).default([]),
          })
          .strict(),
      )
      .default([]),
    /** What the manager has really authorized; concessions inside these limits are true (spec 4.1, AUTH-01). */
    authority: z
      .object({
        min_all_in_price_cents: cents.nullable().default(null),
        min_payment_cents: cents.nullable().default(null),
        max_trade_cents: cents.nullable().default(null),
        manager_has_room: z.boolean().default(false),
      })
      .strict()
      .default({}),
    rep_profile: z
      .object({ hometown: z.string().optional(), school: z.string().optional() })
      .strict()
      .default({}),
    text_consent: z.boolean().default(false),
    /** Facts only the customer knows (budget told to a spouse, another dealer's quote). */
    customer_knows: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).default({}),
  })
  .strict()
  .superRefine((f, ctx) => {
    const fees = f.dealer_fees.reduce((sum, fee) => sum + fee.cents, 0);
    if (f.price_cents + fees !== f.all_in_price_cents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["all_in_price_cents"],
        message: `all_in_price_cents must equal price_cents + dealer fees (${f.price_cents + fees})`,
      });
    }
    for (const rebate of f.rebates) {
      if (!f.deadlines.some((d) => d.date === rebate.ends)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rebates"], message: `rebate ${rebate.code} end date missing from deadlines` });
      }
    }
  });
export type ScenarioFacts = z.infer<typeof factsSchema>;

export const exitPolicySchema = z
  .object({
    walk_away_base: z.number().min(0).max(1),
    not_now_base: z.number().min(0).max(1),
    triggers_raise_by: z.number().min(0).max(1),
    /** Raise for opening with a number and no reason (spec 10.3 item 7). */
    anchor_no_reason_raise: z.number().min(0).max(1).default(0.05),
    /** Turns the rep keeps after an exit to secure a next step (spec 10.3 item 3). */
    grace_turns: z.number().int().min(0).max(3).default(2),
  })
  .strict()
  .refine((p) => p.walk_away_base + p.not_now_base <= 1, "walk_away_base + not_now_base must be at most 1");
export type ExitPolicy = z.infer<typeof exitPolicySchema>;

const scriptLine = z.object({ speaker: z.enum(["rep", "customer"]), text: z.string().min(1) }).strict();
const demonstration = z
  .object({
    notice: bilingual,
    script: z.object({ en: z.array(scriptLine).min(2), es: z.array(scriptLine).min(2) }).strict(),
  })
  .strict();

export const dimension = z.enum(["composure", "discovery", "technique", "honesty", "outcome"]);
export type Dimension = z.infer<typeof dimension>;

export const scoringMethod = z.enum(["timing", "count", "engine", "rule", "judge", "engine_and_judge", "language"]);

export const rubricItemSchema = z
  .object({
    code: z.string().regex(/^[A-Za-z0-9-]+$/),
    behavior: bilingual,
    dimension,
    method: scoringMethod,
    points: z.number().min(0),
    /** Voice-only items are excluded, not zeroed, in text mode (spec 11.5). */
    voice_only: z.boolean().default(false),
    evidence: z.string().min(1),
    technique: techniqueCode.optional(),
    /** Method parameters: thresholds, counts, rule codes. Lives here, never in code (spec 1.1 item 3). */
    params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.array(z.string())])).default({}),
  })
  .strict();
export type RubricItem = z.infer<typeof rubricItemSchema>;

export const autoFailSchema = z
  .object({
    code: z.string(),
    description: bilingual,
    method: z.enum(["judge", "rule_family"]),
    rule_families: z.array(z.string()).default([]),
  })
  .strict();
export type AutoFail = z.infer<typeof autoFailSchema>;

export const scenarioSchema = z
  .object({
    code: z.string().regex(/^S-[a-z0-9-]+-L[1-3]$/),
    module: z.string().min(1),
    title: bilingual,
    setting: bilingual,
    persona: z.string().regex(/^P-[a-z0-9-]+$/),
    objection: objectionCode,
    channel,
    language_options: z.array(z.enum(["en", "es"])).min(1),
    difficulty: z.number().int().min(1).max(3),
    start_state: z.enum(["greeting", "discovery", "presentation", "objection", "negotiation", "closing", "finance_handoff"]),
    /** Shown in the pre-brief: who the customer is and what they came for. Never the hidden truth. */
    pre_brief: bilingual,
    opening: bilingual,
    facts: factsSchema,
    numbers_sheet: z.boolean().default(false),
    target_techniques: z.array(techniqueCode).min(1),
    rubric: z.string().regex(/^R-[a-z]+$/),
    /** Scenario-specific scoring table (spec 10.5); when present its points define the total. */
    scoring: z
      .object({ items: z.array(rubricItemSchema).min(1), auto_fail: z.array(autoFailSchema).default([]) })
      .strict()
      .optional(),
    exit_policy: exitPolicySchema,
    max_turns: z.number().int().positive().default(24),
    time_limit_seconds: z.number().int().positive().default(480),
    demonstrations: z.object({ flawed: demonstration, good: demonstration }).strict(),
    spanish_reviewed: z.boolean().default(false),
    status: z.enum(["active", "retired"]).default("active"),
  })
  .strict();
export type Scenario = z.infer<typeof scenarioSchema>;

// ---------------------------------------------------------------- rubrics (spec 13)

export const rubricSchema = z
  .object({
    code: z.string().regex(/^R-[a-z]+$/),
    title: bilingual,
    /** Dimension weights (spec 13.1); honesty is a gate, not a weight. */
    weights: z.object({ composure: z.number(), discovery: z.number(), technique: z.number(), outcome: z.number() }).strict(),
    items: z.array(rubricItemSchema).min(1),
    pass_threshold: z.object({ level_1: z.number(), level_2: z.number(), level_3: z.number() }).strict(),
    extends: z.string().regex(/^R-[a-z]+$/).optional(),
  })
  .strict()
  .refine((r) => Math.abs(r.weights.composure + r.weights.discovery + r.weights.technique + r.weights.outcome - 1) < 1e-9, "weights must sum to 1");
export type Rubric = z.infer<typeof rubricSchema>;

// ---------------------------------------------------------------- rules (spec 4.4)

export const checkKind = z.enum([
  "price_compare",
  "payment_compare",
  "term_compare",
  "rate_compare",
  "trade_compare",
  "deadline_compare",
  "inventory_compare",
  "authority_compare",
  "identity_compare",
  "pattern",
  "order",
  "presence",
  "language",
  "parity",
  "classifier",
]);
export type CheckKind = z.infer<typeof checkKind>;

export const ruleSchema = z
  .object({
    code: ruleCode,
    family: z.string().min(1),
    severity,
    description: bilingual,
    /** Shown in the debrief; {fact} is replaced with the true fact. */
    explanation: bilingual,
    check_kind: checkKind,
    /** The classifier also checks meaning the deterministic layer misses (spec 4.3 item 2). */
    classifier: z.boolean().default(false),
    applies_to: z.array(speakerRole).min(1),
    channels: z.array(channel).min(1),
    compliant_technique: techniqueCode.nullable().default(null),
    /** Patterns, cue words and thresholds. Bilingual patterns live here so Spanish reviewers can extend them. */
    parameters: z.record(z.string(), z.unknown()).default({}),
    legal_basis: z.string().min(1),
    attorney_reviewed: z.boolean().default(false),
    enabled: z.boolean().default(true),
  })
  .strict();
export type Rule = z.infer<typeof ruleSchema>;

// ---------------------------------------------------------------- behavior cards (spec 14)

export const behaviorCardSchema = z
  .object({
    code: z.string().regex(/^B-T\d{3}-[a-z0-9-]+$/),
    technique: techniqueCode,
    title: bilingual,
    behavior: bilingual,
    /** The four-part floor check (spec 14.2): what I saw, the one behavior, the exact line, when we check again. */
    floor_check_script: z
      .object({ saw: bilingual, behavior: bilingual, line: bilingual, check_again: bilingual })
      .strict(),
    look_for: bilingualList,
    rubric_items: z.array(z.string()).min(1),
    duration_seconds: z.number().int().positive().default(60),
    spanish_reviewed: z.boolean().default(false),
  })
  .strict();
export type BehaviorCard = z.infer<typeof behaviorCardSchema>;

// ---------------------------------------------------------------- modules and glossary

export const moduleSchema = z
  .object({
    code: z.string().regex(/^M-[a-z0-9-]+$/),
    title: bilingual,
    scenarios: z.array(z.string()).min(1),
    certification: z.boolean().default(false),
    level: z.number().int().min(1).max(3).default(1),
  })
  .strict();
export type Module = z.infer<typeof moduleSchema>;

export const glossaryTermSchema = z
  .object({
    en: z.string().min(1),
    es_standard: z.string().min(1),
    es_miami: z.array(z.string().min(1)).min(1),
    avoid: z.array(z.string()).default([]),
    notes: z.string().default(""),
    verified: z.enum(["yes", "written", "partly", "store_setting", "no"]),
    /** Words recognized inside Spanish without counting as English (spec 16.1 rule 5). */
    neutral_tokens: z.array(z.string()).default([]),
    asr_vocabulary: z.boolean().default(true),
  })
  .strict();
export const glossarySchema = z.object({ terms: z.array(glossaryTermSchema).min(1) }).strict();
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;

// ---------------------------------------------------------------- lexicon (cue words for the rule engine)

export const MONEY_ROLES = ["payment", "fee", "rebate", "trade", "down", "price", "payoff", "budget", "gap", "per_day", "add_on"] as const;
export type MoneyRoleName = (typeof MONEY_ROLES)[number];

/** Cue words that tell the rule engine what role a spoken amount plays. Content, so editors can add variants. */
export const lexiconSchema = z
  .object({
    money_roles: z
      .object(
        Object.fromEntries(
          MONEY_ROLES.map((role) => [role, z.object({ before: bilingualList, after: bilingualList }).strict()]),
        ) as Record<MoneyRoleName, z.ZodObject<{ before: typeof bilingualList; after: typeof bilingualList }>>,
      )
      .strict(),
    all_in_markers: bilingualList,
    negations: bilingualList,
    question_markers: bilingualList,
    weekdays: bilingualList,
    months: bilingualList,
    relative_days: z.object({ today: bilingualList, tomorrow: bilingualList }).strict(),
    close_questions: bilingualList,
    tie_downs: bilingualList,
    next_step_time: bilingualList,
    attributions: bilingualList,
    coaching: bilingualList,
  })
  .strict();
export type Lexicon = z.infer<typeof lexiconSchema>;
