# 0017: One level 1 customer for every objection; release 2 customers are practice, not certification

- **Context.**
  - Ernesto asked (2026-10-03) to grow the content library first. The 20 release 1 scenarios and the 600-case
    compliance suite (689 cases) were already done.
  - The spec's next content step: every objection gets a persona and a level 1 scenario by release 2, so 65 in
    all (spec 7 line 487, spec 9, spec 10.2). 45 were missing.
  - The spec does not say how those 45 appear in the app, or whether they count toward certification. Spec 15.4
    and 16.3 only speak of the 20 release 1 scenarios.
- **Decision.**
  - **Content.** One persona and one level 1 scenario per remaining objection, written to the release 1 template
    and its gates:
    - schemas and content compliance checks;
    - the good demo unlocks the hidden truth and wins honestly in both languages;
    - the flawed demo never unlocks.
    - Each hidden truth starts from the objection's "behind it" (spec 9). Each module is the objection's module.
  - **Release status follows the objection.** A scenario is release 1 when its objection is marked `release_1`.
    No new field.
  - **Practice screen.** The 20 release 1 scenarios stay a level-by-level **certification path**. The rest follow
    under **More customers**, grouped by topic (the objection's module).
  - **Certification.** Only certification-path scenarios certify; the server refuses certification on the others.
    Certification counts, the onboarding plan and recertification are unchanged.
  - **Daily plan.** A release 2 customer is offered when a plan slot is free after assignments, compliance redos,
    onboarding, certification and due reviews. The one picked is the objection that costs the store the most deals
    (decision 0018).
  - **Spanish review.** The release 2 customers are listed after the release 1 scenarios, and release 1 does not
    wait on them (spec 16.3 item 4).
  - **Library.** Each objection page has a "Practice this objection" button.
- **Consequence.** Every objection a rep reads about can be practiced. Their Spanish needs the same native review
  before anyone treats it as final, and the authors' lists of words and claims to check are in STATUS.md.
