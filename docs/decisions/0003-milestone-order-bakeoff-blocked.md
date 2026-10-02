# 0003: Start M2 logic while the M1 bake-off waits on the store

- **Context.** Spec 1.1 says not to start a milestone before the previous one passes. M1's acceptance includes a
  speech-recognition bake-off on consented recordings from the pilot store (11.2), which only people can supply.
- **Decision.** Finish every M1 item that does not need people (monorepo, CI, schema with RLS, i18n, provider
  interfaces), mark the bake-off as blocked in `STATUS.md`, and build the M2 core libraries (content, rules,
  engine, scoring), which have no dependency on the speech provider choice.
- **Consequence.** M1 is not formally accepted until the bake-off runs. No provider is committed; both provider
  interfaces stay pluggable. If the bake-off changes assumptions (for example, number accuracy forces stricter
  low-confidence handling), only `services/voice` and the confidence threshold change.
