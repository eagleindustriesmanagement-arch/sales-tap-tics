# 0013: Voice ships in two tiers behind one interface; the device tier first

- **Context.**
  - Spec 11 makes voice the product: hands-free, about one second from when the rep stops talking to when the
    customer answers, interruptions supported, Miami voices.
  - It also makes speech providers pluggable and chosen by a local test on consented floor recordings (11.2).
  - The owner asked for a conversation that flows like a real one, runs efficiently and is not expensive. Practice
    was typed only.
- **Decision.**
  - `@taptics/voice` holds the parts that do not depend on a provider:
    - the `SpeechToText` and `TextToSpeech` contracts (spec 5.4);
    - turn-taking: end of turn after 700 ms of silence in English and 850 ms in Spanish, a 90-second cap, barge-in
      that tells the rep's words from the customer's own echo, and the pause and speaking-rate measurements;
    - numbers read aloud the way a person says them in both languages (spec 11.4 item 4).
  - **Device tier (built now).** It uses the phone's or browser's own recognizer and voices.
    - No per-minute cost.
    - No audio goes to a speech vendor of ours. The browser's recognizer may use its maker's servers: Google in
      Chrome, Apple in Safari.
    - The customer speaks each sentence as it clears the compliance guard, so the reply starts before it is
      complete.
    - On iPhone, listening pauses while the customer talks, because iOS plays through the quiet earpiece while the
      microphone is open; the rep interrupts by tapping.
    - Limits: one language per session (no mixed Spanish and English), voice quality depends on the device, and
      speech timing comes from the recognizer's speech start and end events, which are less precise than word
      timestamps.
  - **Cloud tier (next, behind the same contracts).** Streaming recognition and streaming voices through the voice
    gateway (`services/voice`). This brings mixed-language recognition, word timestamps, Miami-tuned voices per
    persona, and barge-in on every device. The providers come from the spec 11.2 bake-off; current candidates are
    Deepgram Nova-3 (multilingual streaming) for recognition and Cartesia Sonic or ElevenLabs Flash for voices.
  - Speech-to-speech models (one model that listens and talks) are not used. The compliance engine must check every
    customer sentence before it is spoken (spec 5.2 item 6), the customer is a Claude persona with a scenario engine,
    and those models cost more per minute.
- **Cost per 10-minute session.** Estimates, to be replaced by the cost dashboard's measurements.
  - AI customer, Claude Sonnet 5.5 at $2 and $10 per million tokens, cache reads $0.20: about $0.05 to $0.10.
  - Live checks on Haiku 4.5 (classifier and unlock detector): about $0.03 to $0.06.
  - Scoring judge, Claude Opus 5.5 at $4 and $20 per million tokens (thinking is always on, so its output runs
    longer): about $0.05 to $0.15.
  - Device tier speech: $0.
  - Cloud tier speech: recognition at $0.0058 a minute (Deepgram Nova-3 multilingual, promotional; $0.0092
    regular), about $0.06 to $0.09 for the session. Voice at $39 to $50 per million characters for about 3,000
    characters, about $0.11 to $0.14.
  - Totals: about $0.15 to $0.30 a session on the device tier, about $0.35 to $0.55 on the cloud tier.
- **Consequence.**
  - Voice practice works today on Chrome, Safari and Android at no speech cost.
  - The pilot moves to the cloud tier per store once the bake-off picks providers and the owner sets up the
    accounts.
  - In the store apps (decision 0012), the native shell swaps the browser recognizer for the phone's on-device one
    (iOS speech framework, Android on-device recognition) through a Capacitor plugin, behind the same contract.
- **Sources.** [Deepgram pricing](https://convertaudiototext.com/blog/deepgram-nova-3-explained),
  [Nova-3 multilingual rate](https://www.gladia.io/blog/deepgram-review),
  [Cartesia vs ElevenLabs latency and price](https://futureagi.com/blog/best-text-to-speech-providers-2026/),
  [Web Speech in WKWebView](https://bugs.webkit.org/show_bug.cgi?id=225298),
  [Capacitor speech recognition](https://capawesome.io/docs/sdks/capacitor/speech-recognition/).
