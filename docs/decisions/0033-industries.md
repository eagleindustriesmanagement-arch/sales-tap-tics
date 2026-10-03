# 0033: Each industry practices with its own customers; car law applies only to car sales

- **Context.** Decision 0032 opened sign-up to anyone selling something big: cars, homes, solar, furniture. The
  techniques and lessons are universal, but every role-play customer was a car buyer, and five compliance rules come
  from car-dealer law (the FTC's vehicle rules and state add-on and cancellation laws). Scoring a solar rep against a
  dealer add-on rule would be wrong, and a home buyer practicing on a Corolla trade-in is not training.
- **Decision.**
  - **Rules know which sales they govern.** A rule has `industries`, all four by default. CANCEL-01, ADD-02, ADD-04,
    PRICE-02 and PRICE-04 are `[cars]`. The engine and the money classifier skip a rule outside the session's
    industry; a check without an industry is a car check, so every existing caller and the 689-case corpus are
    unchanged.
  - **Scenarios know their industry**, `cars` by default. A session carries its scenario's industry into every check.
  - **The rep's own industry first.** The daily plan and the practice list draw from the rep's industry (cars when an
    industry has no customers yet, or for "other"); the rep's own topic sorts first; reviewers see every industry.
  - **Certification stays with cars** for now: the 20 certification scenarios, their lessons and release-1 grouping
    are car scenarios. Other industries practice and are scored, and do not certify until a certification path is
    written and reviewed for them.
  - **Honesty on the way.** While an industry has no customers, Today says so and offers the car customers to
    practice the techniques. The note goes away by itself once that industry has scenarios.
- **The first packs.** Five level-1 customers each for homes, solar and furniture, on the five most common
  objections (homes swaps the payment objection for "my advisor says wait": these reps never quote a mortgage
  payment). Each industry onboards through its own customers in the same order the car path uses; with no
  certification path, its reps are never asked to certify. The home page counts customers per industry from the
  library and marks one live only when it has them. Review notes: `docs/content/industry-packs-review-notes.md`.
- **Consequences.** Adding an industry is content work: personas, scenarios and lessons tagged with the industry,
  passing the same validation and release gate. A new rule that only binds one kind of sale must say so.
