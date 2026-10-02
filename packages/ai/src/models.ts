/**
 * Model settings per purpose (spec 5.3). Model strings are configuration: verify them against Anthropic's model
 * list at deploy time and override with environment variables, never by editing calling code.
 */
export type Purpose = "customer" | "classifier" | "unlock" | "judge";

export interface ModelSettings {
  model: string;
  maxTokens: number;
  timeoutMs: number;
  /** Effort for models that take it (output_config.effort). */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  /** Sonnet 5.5 cannot disable thinking; "between_tools" is its no-thinking mode (latency matters for the customer). */
  thinking?: "adaptive" | "between_tools" | "none";
  /** Only models that accept sampling parameters (Haiku 4.5) get a temperature. */
  temperature?: number;
  /** Server-side refusal fallback ("default" routing) on models that support it. */
  fallbacks: boolean;
  /** Dollars per million tokens, for the per-tenant cost log. Verify against current pricing. */
  price: { input: number; output: number; cacheRead: number; cacheWrite: number };
}

export const DEFAULT_MODELS: Record<Purpose, ModelSettings> = {
  // Streams every customer line; first token budget is 400 ms (spec 5.6).
  customer: {
    model: "claude-sonnet-5-5",
    maxTokens: 400,
    timeoutMs: 8_000,
    effort: "low",
    thinking: "between_tools",
    fallbacks: true,
    price: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  },
  // Live compliance classifier: fast, low cost, temperature 0, JSON (spec 4.3, 5.3).
  classifier: {
    model: "claude-haiku-4-5",
    maxTokens: 1024,
    timeoutMs: 4_000,
    temperature: 0,
    thinking: "none",
    fallbacks: false,
    price: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  },
  // Unlock and trigger detection after each rep turn (spec 10.3 item 1).
  unlock: {
    model: "claude-haiku-4-5",
    maxTokens: 512,
    timeoutMs: 3_000,
    temperature: 0,
    thinking: "none",
    fallbacks: false,
    price: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  },
  // Post-session judge: the most capable model, structured output, under 60 s (spec 13.4).
  judge: {
    model: "claude-opus-5-5",
    maxTokens: 16_000,
    timeoutMs: 90_000,
    effort: "high",
    thinking: "adaptive",
    fallbacks: true,
    price: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  },
};

/** Environment overrides: AI_MODEL_CUSTOMER=..., AI_EFFORT_JUDGE=..., and so on. */
export function modelsFromEnv(env: Record<string, string | undefined> = process.env): Record<Purpose, ModelSettings> {
  const out = structuredClone(DEFAULT_MODELS);
  for (const purpose of Object.keys(out) as Purpose[]) {
    const key = purpose.toUpperCase();
    const model = env[`AI_MODEL_${key}`];
    const effort = env[`AI_EFFORT_${key}`] as ModelSettings["effort"] | undefined;
    if (model) out[purpose].model = model;
    if (effort) out[purpose].effort = effort;
  }
  return out;
}
