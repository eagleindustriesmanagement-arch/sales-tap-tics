# 0002: Scenario state machine lives in `packages/engine`

- **Context.** Spec 10.3 says the state machine runs in the voice gateway. The simulator-fidelity tests (21.3), the
  text-mode practice room and the worker all need the same logic.
- **Decision.** Put the state machine in `packages/engine`, a pure library with no I/O. The voice gateway hosts it;
  tests and the text fallback call it directly.
- **Consequence.** One implementation, testable without audio. The gateway stays a thin transport layer.
