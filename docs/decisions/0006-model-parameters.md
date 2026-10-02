# 0006: Model parameters differ from the spec's examples

- **Context.** Spec 5.3 suggests temperature 0.8 for the customer (`claude-sonnet-5-5`) and temperature 0 for the
  judge (`claude-opus-5-5`). Both models reject non-default sampling parameters with a 400. Opus 5.5 cannot turn
  thinking off; Sonnet 5.5 turns it off only with `thinking: {type: "between_tools"}`.
- **Decision.** Customer: Sonnet 5.5, `between_tools` thinking, effort `low`, streaming; natural variation comes from
  the seeded persona variation (spec 10.3 item 6) instead of temperature. Classifier and unlock detector: Haiku 4.5,
  temperature 0, structured JSON. Judge: Opus 5.5, adaptive thinking, effort `high`, structured JSON; repeatability
  comes from the fixed prompt version, the schema and the gold-set regression test (spec 21.4), not temperature.
  Sonnet 5.5 and Opus 5.5 calls carry the server-side refusal fallback (`fallbacks: "default"`), so a safety decline
  is answered by a fallback model instead of an empty turn. All of this is configuration in `packages/ai/src/models.ts`,
  overridable by environment variable, with a kill switch per purpose and per model.
- **Consequence.** The latency budget for the customer (first token under 400 ms median) must be measured once a key
  is available; if Sonnet 5.5 at `low` misses it, the customer model is a one-line configuration change.

- **Status (2026-10-02, confirmed).** Ernesto confirmed the closest supported settings with the automatic backup model
  on. To turn the backup off later: `fallbacks: false` per purpose in `packages/ai/src/models.ts`.
