import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { DEFAULT_MODELS, type ModelSettings, type Purpose } from "./models.js";

/** One model call, logged per tenant (spec 5.3: token and cost logging per tenant). Never includes text. */
export interface UsageRecord {
  tenantId: string;
  sessionId: string | null;
  purpose: Purpose;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  latencyMs: number;
  /** Time to first streamed text, for the customer turn latency budget. */
  firstTokenMs: number | null;
  ok: boolean;
  error?: string;
}

export interface UsageSink {
  record(entry: UsageRecord): void;
}

export class MemoryUsageSink implements UsageSink {
  readonly entries: UsageRecord[] = [];
  record(entry: UsageRecord) {
    this.entries.push(entry);
  }
}

export class ModelDisabledError extends Error {
  constructor(readonly purpose: Purpose, readonly model: string) {
    super(`model ${model} for ${purpose} is switched off`);
  }
}

export interface CallContext {
  tenantId: string;
  sessionId?: string | null;
  promptVersion: string;
}

/** The subset of the SDK the app uses, so tests can pass a fake. */
export type MessagesApi = Pick<Anthropic, "beta">;

const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const CLEAR_AT_BETA = "mid-conversation-system-clear-at-2026-08-21";

/**
 * The one wrapper around every model call (spec 5.3): retries and timeouts from the SDK, a kill switch per
 * purpose and per model, and a usage record per call with tenant, tokens and cost.
 */
export class AiClient {
  readonly models: Record<Purpose, ModelSettings>;
  private readonly killed = new Set<string>();

  constructor(
    private readonly api: MessagesApi = new Anthropic({ maxRetries: 2 }),
    private readonly sink: UsageSink = new MemoryUsageSink(),
    models: Record<Purpose, ModelSettings> = DEFAULT_MODELS,
  ) {
    this.models = structuredClone(models);
  }

  /** Kill switch: a purpose ("judge") or a model id ("claude-opus-5-5"). */
  disable(key: Purpose | string) {
    this.killed.add(key);
  }
  enable(key: Purpose | string) {
    this.killed.delete(key);
  }
  isEnabled(purpose: Purpose): boolean {
    return !this.killed.has(purpose) && !this.killed.has(this.models[purpose].model);
  }

  private guard(purpose: Purpose) {
    if (!this.isEnabled(purpose)) throw new ModelDisabledError(purpose, this.models[purpose].model);
  }

  /** Request fields that depend on the model settings, not on the caller. */
  baseParams(purpose: Purpose, extraBetas: string[] = []) {
    const s = this.models[purpose];
    const betas = [...extraBetas];
    if (s.fallbacks) betas.push(FALLBACK_BETA);
    return {
      model: s.model,
      max_tokens: s.maxTokens,
      ...(s.thinking === "adaptive" ? { thinking: { type: "adaptive" as const } } : {}),
      ...(s.thinking === "between_tools" ? { thinking: { type: "between_tools" as const } } : {}),
      ...(s.effort ? { output_config: { effort: s.effort } } : {}),
      ...(s.temperature !== undefined ? { temperature: s.temperature } : {}),
      ...(s.fallbacks ? { fallbacks: "default" as const } : {}),
      ...(betas.length ? { betas } : {}),
    };
  }

  private log(purpose: Purpose, ctx: CallContext, started: number, firstToken: number | null, message: BetaMessage | null, error?: unknown) {
    const s = this.models[purpose];
    const u = message?.usage;
    const input = u?.input_tokens ?? 0;
    const output = u?.output_tokens ?? 0;
    const cacheRead = u?.cache_read_input_tokens ?? 0;
    const cacheWrite = u?.cache_creation_input_tokens ?? 0;
    this.sink.record({
      tenantId: ctx.tenantId,
      sessionId: ctx.sessionId ?? null,
      purpose,
      model: message?.model ?? s.model,
      promptVersion: ctx.promptVersion,
      inputTokens: input,
      outputTokens: output,
      cacheReadTokens: cacheRead,
      cacheWriteTokens: cacheWrite,
      costUsd: (input * s.price.input + output * s.price.output + cacheRead * s.price.cacheRead + cacheWrite * s.price.cacheWrite) / 1_000_000,
      latencyMs: Date.now() - started,
      firstTokenMs: firstToken === null ? null : firstToken - started,
      ok: !error,
      ...(error ? { error: error instanceof Error ? error.constructor.name : "unknown" } : {}),
    });
  }

  /**
   * Streams text for the customer. Yields text deltas as they arrive; the caller splits sentences, guards each one
   * and may stop early (breaking the loop aborts the request).
   */
  async *streamText(purpose: Purpose, params: Omit<MessageCreateParamsNonStreaming, "model" | "max_tokens">, ctx: CallContext): AsyncGenerator<string, BetaMessage | null> {
    this.guard(purpose);
    const started = Date.now();
    let first: number | null = null;
    const base = this.baseParams(purpose, [CLEAR_AT_BETA]);
    const stream = this.api.beta.messages.stream({ ...base, ...params } as MessageCreateParamsNonStreaming, { timeout: this.models[purpose].timeoutMs });
    let finished = false;
    try {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          first ??= Date.now();
          yield event.delta.text;
        }
      }
      const message = await stream.finalMessage();
      finished = true;
      this.log(purpose, ctx, started, first, message);
      return message;
    } catch (error) {
      finished = true;
      this.log(purpose, ctx, started, first, null, error);
      throw error;
    } finally {
      if (!finished) {
        stream.abort();
        this.log(purpose, ctx, started, first, null);
      }
    }
  }

  /** A structured-output call, validated against the format's schema by the SDK (spec 4.3, 13.4). */
  async parse<T>(purpose: Purpose, params: Omit<MessageCreateParamsNonStreaming, "model" | "max_tokens">, ctx: CallContext): Promise<{ parsed: T | null; message: BetaMessage }> {
    this.guard(purpose);
    const started = Date.now();
    try {
      const message = await this.api.beta.messages.parse({ ...this.baseParams(purpose), ...params } as MessageCreateParamsNonStreaming, { timeout: this.models[purpose].timeoutMs });
      this.log(purpose, ctx, started, null, message);
      if (message.stop_reason === "refusal") return { parsed: null, message };
      return { parsed: ((message as unknown as { parsed_output?: T | null }).parsed_output ?? null) as T | null, message };
    } catch (error) {
      this.log(purpose, ctx, started, null, null, error);
      throw error;
    }
  }
}
