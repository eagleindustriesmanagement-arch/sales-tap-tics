# 0036: iPhone voice: the customer speaks, the rep talks through the keyboard

- **Context (October 4).** On Ernesto's iPhone, with the voice fix live, "Test the sound" made no sound, and the
  microphone prompt appeared but nothing listened.
  - **Silence.** Our own "unlock" spoke an utterance of a single space before every tap-triggered line. On iOS an
    utterance of only whitespace can never start or end, and every utterance queued behind it stays silent. The
    browser tests missed it because their fake engine ignored blank text. A second risk: we picked "Enhanced",
    "Premium" or "Siri" voices by name, which iPhone lists even when they are not downloaded (choosing one is
    silence).
  - **Microphone.** iOS Safari does have `webkitSpeechRecognition`, but it runs on Siri dictation: it needs Dictation
    on, fails from the Home Screen, and stops on short pauses. Starting it still raises the microphone prompt.
- **Decision.**
  - The unlock speaks a real character at volume 0. A tap clears a stuck engine first, and if a line has not
    started after 1.5 s it is cleared and said again with the phone's default voice. On iPhone the language alone
    picks the voice.
  - The app never starts speech recognition on iPhone or iPad, so it never asks for the microphone there. "Talk" on
    iPhone is "Tap to talk": a large green button opens the answer box, and numbered steps show how to use the
    keyboard's own microphone key (iOS dictation, no permission from the page, no cost). The customer's lines are
    read aloud, and every customer line has a speaker button that plays it from a tap.
  - A sound check on the start screen plays the voice and a plain beep and shows what the engine did: the app
    version, device and Home Screen mode, voice counts, the voice used, each line's queued/start/end/error with
    times, and whether the engine was stuck. "Copy these details" puts it in a message.
  - Phones stay on the current release: the app compares its build with the server's on every return to the
    foreground and every 5 minutes, and reloads (or, mid-conversation, offers to).
- **Open, the owner's call.** Real speech-to-text on iPhone needs the cloud tier: record with MediaRecorder and
  transcribe on the server (Whisper or similar), at a per-minute cost. Not built until approved.
- **Test.** The iPhone browser test now uses an engine that wedges on blank text like iOS; with the old unlock the
  test hears nothing, and with this one it hears the test line, the opening and each reply.
