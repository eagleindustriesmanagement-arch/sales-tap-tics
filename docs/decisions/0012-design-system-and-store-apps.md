# 0012: Liquid Glass design system; the store apps are a native shell around the web app

- **Context.** The owner judged the first UI unpolished and said the product will ship to the App
  Store and Google Play. He asked for the BookFlows Liquid Glass guidelines and for the flow of a
  learning platform: progress and what to do next always visible. Spec 4 places a React Native app
  in release 2 (`apps/mobile`).
- **Decision.**
  - The web app adopts BookFlows' Liquid Glass material with its shipped values
    (`docs/LIQUID-GLASS.md`) and Sales Tap-tics tokens (`docs/DESIGN-GUIDELINES.md`). Every value
    that differs in dark mode is a token, so the material is written once.
  - The rep flow follows learning-app patterns: one "Up next" with one Start button, a daily goal
    and streak, a connected path by level, an immersive session, a results screen, and Progress
    as its own tab.
  - Release 1 reaches the stores the way BookFlows does: a Capacitor shell that loads the live web
    app and adds what a browser cannot (push reminders, and the microphone for voice practice).
    Those native features are also what Apple's guideline 4.2 (minimum functionality) asks of a
    web-view app. One deploy updates the web and both apps.
  - A separate React Native app stays a release 2 option, only if the shell falls short (for
    example, audio latency in voice practice).
- **Consequence.**
  - The UI is now built phone-first: safe areas, a floating tab bar, 16px fields and 44px
    targets.
  - Building the shell needs the owner's Apple and Google developer accounts, a bundle id, and a
    hosted URL.
  - Push needs a provider decision (spec M6). Voice needs the speech provider bake-off.
