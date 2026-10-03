# 0031: Every certification scenario teaches the tactic before it tests it

- **Context.** Ernesto (October 3): the loop was "watch a good and a bad example, then try it". A rep must first
  learn the tactic, then be tested on it: learn, see it, do it, get scored, for all 20 certification scenarios.
- **Decision.**
  - **Lessons are content**, in `packages/content/library/lessons/`, one per scenario, both languages (`lessonSchema`).
    Each has:
    - a hook; what the tactic is; why it works (the customer's psychology); when to use it and when not;
    - 3 to 5 phrases to say word for word;
    - the mistakes that kill it, each with its fix;
    - named concepts, each tied to the behaviors the scenario scores.
  - **Validation:**
    - the scenario exists and has one lesson;
    - every behavior the scenario scores belongs to a concept;
    - the lesson reads in 60 to 90 seconds (200 to 340 words in English, 220 to 400 in Spanish).

    A test requires all 20 certification scenarios to have one. Every phrase goes through the compliance engine
    against the scenario's own facts, and a critical finding blocks the build.
  - **The flow:**
    - Practice opens on the lesson, with a step bar: Learn, See it, Do it, Get scored.
    - "See it done" leads to the demonstration; "Skip to practice" goes to the briefing.
    - The briefing offers "Review the lesson".
    - Certification is a test, so it skips the lesson.
    - There is no on-device "already read" memory: it would make the lesson flash before disappearing on a return
      visit.
  - **Feedback names the lesson:**
    - the debrief's "one change that matters most" adds "From the lesson: <concept>" with the concept's idea;
    - each win and each scored behavior carries its concept's name.

    The mapping is deterministic, from the lesson file. The AI judge's prompt is unchanged.
- **Consequence.**
  - The Spanish needs a native Miami speaker's review (`spanish_reviewed: false` on every lesson, listed as a
    warning).
  - The 45 practice-only scenarios have no lesson yet; the same format applies when they get one.
