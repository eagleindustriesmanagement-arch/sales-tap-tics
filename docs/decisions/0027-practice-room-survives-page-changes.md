# 0027: The practice room survives a crash while drawing, and reports it

- **Context.**
  - On the live site (October 3), the first typed Send in "I need to talk to my wife" replaced the room with Next's
    "This page couldn't load. Reload to try again, or go back." That wording is used only for an error in the
    browser.
  - The turn itself went through: the sessions were saved.
  - Local runs could not reproduce it, with the offline customer or a live (stand-in) AI customer, with the turn
    sent to a second server instance, or on desktop Chrome. Production could not be reached from the build
    environment.
  - The same screen appeared when something outside React removed a node React had drawn (here the "typing" dots)
    while the reply was on its way: React's `removeChild` failed and nothing caught it. Browser page translation and
    extensions change pages in this way.
  - This is the most likely cause. It is not confirmed.
- **Decision.**
  - **Recovery.** The live room sits inside a recovery boundary (`components/recover.tsx`). On an error it draws the
    room again from scratch, keeping the conversation, which lives above it.
    - After two failed redraws it offers the debrief or a fresh start.
    - Every other screen has an app error screen with Try again; the last-resort global error page has Reload.
  - **No machine translation.** The live conversation is marked `translate="no"`: the rep practices in the language
    chosen, and the browser must not translate the customer. Bubble text sits in its own element.
  - **A damaged stream cannot break the room.**
    - A turn line that is not JSON is skipped.
    - A "sentence" that is not text is skipped.
    - The server streams only non-empty text.
  - **Reporting.** Crashes are reported to `POST /api/client-error` (signed-in users) and logged as `client_error`
    with:
    - the area, the error's name, its message and its first stack frame;
    - the path and the browser family;
    - whether the page was machine-translated.

    Never anything typed or said; the log's redaction still applies.
- **Verified.**
  - The end-to-end test "a typed turn renders the reply, even when the stream is damaged or the page is changed
    under it" covers:
    - a real typed turn;
    - a damaged stream;
    - a node removed mid-turn: the room recovers, the conversation stays and the report arrives;
    - a real turn after that.
  - Before the fix, the same removal reproduced the production screen.
- **Consequence.** If it happens again, search the host's logs for `client_error`: the report names the real cause.
