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
  /**
   * "none" sends no thinking parameter: the model's default (Haiku 5.5 then thinks adaptively, kept short by effort).
   * Sonnet 5.5 cannot disable thinking; "between_tools" is its no-thinking mode (latency matters for the customer).
   */
  thinking?: "adaptive" | "between_tools" | "none";
  /**
   * Sampling temperature, for a model that accepts one. No default model does now: Sonnet 5.5, Opus 5.5 and Haiku 5.5
   * return a 400 on a non-default temperature, top_p or top_k, so their entries leave this unset.
   */
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
  // Live compliance classifier: fast, low cost, structured JSON (spec 4.3, 5.3). Haiku 5.5 thinks adaptively when
  // `thinking` is not sent; effort "low" keeps that short (it skips thinking on simple lines), and the token cap
  // leaves room for thinking plus the JSON, since thinking counts toward max_tokens.
  classifier: {
    model: "claude-haiku-5-5",
    maxTokens: 2048,
    timeoutMs: 4_000,
    effort: "low",
    thinking: "none",
    fallbacks: false,
    // Prompts under 100K tokens; Haiku 5.5's tokenizer counts about 30% more tokens for the same text.
    price: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  },
  // Unlock and trigger detection after each rep turn (spec 10.3 item 1).
  unlock: {
    model: "claude-haiku-5-5",
    maxTokens: 1024,
    timeoutMs: 3_000,
    effort: "low",
    thinking: "none",
    fallbacks: false,
    price: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
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
