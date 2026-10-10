# Sales Roleplay Trainer: Build Spec for Claude Code

Oct 1, 2026 · @Eagle Industries LLC

## 1. Read this first

This spec defines a production-ready, bilingual (English and Miami Spanish) voice roleplay app that trains car salespeople against AI customers, scores them, and hands their manager one behavior to check on the floor each week. It is written for Claude Code to build from, end to end, without needing the conversation that produced it. Every rule, number and line of dialogue in it came from twelve research passes; where a number is uncertain the spec says so, and the code must keep that uncertainty visible rather than hide it.

### 1.1 How to read and use this spec

1. **Read sections 1 to 4 completely before writing any code.** They define what the product is, who uses it, and the rules it may never break. Sections 5 onward define how to build it.
2. **Treat section 4 (ground rules) and section 13 (scoring) as the product's core.** Most AI roleplay products already exist. This one differs because it is compliance-aware, bilingual, built around a hidden customer concern, and tied to a manager's floor check. If a trade-off threatens one of those four, the trade-off loses.
3. **Content is data, not code.** Sections 8 and 9 contain the full technique and objection library. Store it as versioned content files (section 7), load it at runtime, and never hard-code a technique, objection, script line or rubric weight inside application logic. Managers and content editors will change content far more often than engineers change code.
4. **Build in the order given in section 22.** Each milestone ends with acceptance criteria. Do not start a milestone until the previous one passes its criteria.
5. **When the spec is silent, choose the simplest option that keeps the four core properties intact, write the decision into `docs/decisions/` as a short record (context, decision, consequence), and continue.** Do not stop to ask unless the choice would change a compliance rule, a scoring weight, or a customer-facing sentence.
6. **When the spec contradicts itself, the later and more specific section wins, except that section 4 always wins.** Record the contradiction in `docs/decisions/`.

### 1.2 Non-negotiables

These are absolute. Any build that violates one is not done, regardless of how much else works.

1. **Hardball yes, lies about facts no.** The app teaches firm negotiation: anchoring, holding back the best number, trading concessions for commitments, real urgency, takeaways, silence and manager turnover. It never teaches, models, rewards or scores neutrally any statement that misstates price, payment, rate, fees, trade value, deadlines, availability, authority limits or lender approval. It never teaches payment packing or holding a customer's keys or license. Section 4 turns this into machine-checkable rules.
2. **The AI customer never coaches the rep toward a violation.** Persona prompts, demonstrations and debriefs must all pass the same compliance check as a rep's speech.
3. **Bilingual parity.** Every customer-facing line, persona, scenario, debrief and score explanation exists in English and Spanish with the same meaning and the same rules. Spanish is written natively for Miami (usted by default), never machine-translated at runtime without human-approved source text. Section 16 defines this.
4. **Hidden concern design.** Every AI customer carries a stated objection and a hidden real concern that only surfaces when the rep asks well. A customer without a hidden concern is a bug.
5. **Customers can walk away.** Research (section 10) shows AI-simulated customers almost never leave on their own, which inflates scores. Walk-aways and "not now" exits are enforced by the scenario engine with set rates, not left to the language model's judgment.
6. **Scores measure behavior, not impression.** Every rubric item is an observable behavior tied to a stated evidence source. Overall impressions are never scored, because research shows they do not predict sales.
7. **Self-report is never the proof of learning.** Transfer to the floor is measured by manager observation and CRM outcomes, never by the rep's own rating.
8. **The manager is a user with a job, not a viewer.** The manager's floor check is a first-class workflow that the app schedules, scripts and tracks (section 14).
9. **No customer data leaves the tenant.** Recordings, transcripts and CRM data belong to the dealership. Section 20 defines retention, consent and access.
10. **Uncertain evidence stays labeled.** Every technique carries an evidence grade. The app shows it to managers and content editors and never presents practitioner tradition as proven science.

### 1.3 Definition of done for the whole product

The product is done for its first release when all of the following are true at the pilot dealership:

- A new rep can log in on a phone or laptop, choose English or Spanish, watch a demonstration, run a spoken roleplay against an AI customer, and receive a scored debrief with one behavior to practice, in under 15 minutes end to end.
- Median voice turn latency (rep stops speaking to customer starts speaking) is under 1.2 seconds, and the 95th percentile is under 2.5 seconds, in both languages.
- Every one of the 122 techniques and 65 objections in sections 8 and 9 is loaded from content files, viewable in the content library, and assignable by a manager.
- The compliance checker (section 4) catches every violation in the test suite in section 21, in both languages, with zero false negatives on the critical rules and a false positive rate under 5%.
- A manager can see each rep's scores, assign a module, receive a weekly floor-check card, record the check in under 60 seconds, and see completion rates.
- Walk-away and "not now" endings occur at the configured rate per scenario, within plus or minus 5 percentage points over 100 test sessions.
- All content shows its evidence grade and source.
- The app passes the security checklist in section 20 and the test plan in section 21.

### 1.4 What this product is not

- It is not a CRM, a desking tool, a finance menu or a lead router. It integrates with those (section 19) but does not replace them.
- It is not a script reader. Reps are scored on behaviors, not on reciting exact words. Exact lines in the library are models, not requirements.
- It is not legal advice. The compliance rules encode research and must be reviewed by a Florida dealer attorney before launch (section 23). The app must display that it is a training tool, not legal guidance.
- It is not a pressure tool. Nothing in it teaches a rep to keep a customer from leaving, to invent urgency, or to wear a customer down.

### 1.5 Repository conventions

- Monorepo, TypeScript throughout, strict mode on.
- Top-level folders: `apps/web` (Next.js web and installable PWA), `apps/mobile` (React Native, release 2), `services/voice` (real-time voice gateway), `services/worker` (scoring and background jobs), `packages/content` (content schemas and the content files), `packages/rules` (compliance rule engine), `packages/scoring` (rubric engine), `packages/db` (schema and migrations), `packages/ui` (shared components), `packages/i18n` (strings and glossary), `docs/` (decisions, runbooks).
- Every package has unit tests. Every content file is validated against its schema in CI. Every customer-facing string is in `packages/i18n` with both languages present, enforced by a CI check that fails if either language is missing.
- Names in code are English. Content may be bilingual.

## 2. Product definition

The product turns a dealership's sales training from occasional classroom sessions into short, frequent, scored voice practice against realistic customers, with the manager closing the loop on the floor. The pilot customer is a franchise, Chevrolet-centered, high-volume, bilingual dealership in Miami, Florida, part of Bomnin Automotive Group. The paying customer is the dealership (the general manager, general sales manager or dealer principal); the daily user is the salesperson.

### 2.1 The problem, with the numbers behind it

- **Turnover makes speed to competence the main need.** Annualized sales consultant turnover at non-luxury dealerships was 73% in 2024, with a median tenure of 1.9 years and one-year retention of 66% (NADA 2025 Dealership Workforce Study). A store loses most of its training investment within two years, so new hires must reach a usable standard in weeks, not months.
- **Most deals that stall are lost to indecision, not to a competitor.** In a study of 2.5 million recorded sales calls, 40% to 60% of qualified deals ended in no decision, and 87% of calls showed moderate or high customer indecision (Dixon and McKenna, The JOLT Effect). The data is business-to-business, so applying it to the showroom is an inference, but fear of a wrong choice in a large, infrequent purchase plausibly applies even more to cars.
- **The reason a customer gives for leaving is rarely the real one.** In interviews with unsold showroom shoppers, salespeople logged "no time" or "need another decision maker" more than half the time, but only 3% of customers gave that as the real reason; price, shopping and financial reasons made up 45% (CAR-Research XRM study, 2009 to 2010, directional only). This is why every AI customer has a hidden concern.
- **Skills decay within days without practice.** A meta-analysis of skill decay found substantial loss within one to seven days of non-practice, with cognitive skills decaying faster than physical ones, and less loss when practice conditions match real conditions (Arthur and others, 1998). This is why practice is spoken, short and frequent.
- **Roleplay alone does not raise average sales.** The largest field study of AI roleplay, about 2,000 salespeople, found no significant average sales effect; gains of 7% to 35% appeared for low prior performers, high goal-setters, long-tenured reps and reps with strong supervisors (Habel, Ahearne, Tirunillai and Vandaveer Novak, working paper, 2025). This is why the manager loop is part of the product, not an add-on.
- **Coaching skill matters more than coaching frequency.** In 1,246 reps across 136 districts, managers' coaching skill predicted goal attainment, and frequent coaching from low-skill managers lowered it (Dahling and others, 2016). This is why the app scripts and scores the manager's floor check.
- **Compliance risk is rising, not falling.** In 2026 the FTC sent warning letters to 97 dealer groups, settled with Lindsay Automotive, issued pricing guidance treating calls and texts as advertising, and a 41-state settlement with Credit Acceptance (joined by Florida) added add-on disclosure controls. A training product that teaches the wrong line creates legal exposure for the store.

### 2.2 Users

| User | Goal | Main jobs in the app | Device |
| --- | --- | --- | --- |
| Salesperson (rep) | Sell more, earn more, get certified | Daily practice, review debriefs, see progress, prepare for a known customer | Phone first, laptop second |
| BDC agent | Set more appointments that show | Phone and text roleplays, all-in quote practice | Laptop with headset |
| Sales manager | Raise the team's closing rate and gross, keep reps | Assign modules, run floor checks, review scores, coach | Phone on the floor, laptop at the desk |
| General sales manager or general manager | Store performance, compliance, return on training | Dashboards, certification status, compliance flags | Laptop |
| Content editor (internal or dealer trainer) | Keep content accurate and local | Edit techniques, scenarios, Spanish lines, rubric weights | Laptop |
| Platform admin (us) | Run the service | Tenants, billing, content releases, model settings | Laptop |

### 2.3 Goals and success metrics

The product proves its value at the pilot through outcome metrics the store already tracks. Engagement metrics are leading indicators only.

| Metric | Definition | Pilot target | Source |
| --- | --- | --- | --- |
| Time to certification | Days from hire to passing all level 1 objections | Under 30 days | App |
| Practice frequency | Sessions per rep per week | 3 or more | App |
| Floor check completion | Share of weekly behavior cards checked by the manager | 80% or more | App |
| Walk-in close rate | Deliveries divided by all logged ups, counted Joe Verde's way (every interested person, not pre-qualified ups) | Baseline in month 1, then improvement | Store CRM |
| Appointment set and show rates | Phone and internet leads that set, and set appointments that show | Baseline, then improvement | Store CRM |
| Add-on cancellation rate | Service contracts and GAP cancelled within 60 days | Lower than baseline | Store F&I records |
| Compliance flags per 100 sessions | Critical rule hits in practice | Falling month over month | App |
| Rep retention at 90 days | Share of new hires still employed | Higher than prior cohort | Store HR |

The store's own data is the only reliable baseline. Public benchmarks conflict: one CRM vendor reports walk-in close rates from 7% to 41% within the same dealership, and Joe Verde argues the accepted 20% closing ratio is inflated by pre-qualifying ups and counting write-ups. The app must let the store define its metric once and then hold it constant.

### 2.4 Scope by release

**Release 1: pilot (the Miami store).**

- Car sales module: all 122 techniques and 65 objections as content; at least 20 fully built scenarios covering the 18 core objections plus the two-payment menu and the all-in phone quote.
- Voice roleplay in English and Spanish, with demonstration (good and flawed model), roleplay, scored debrief and behavior card.
- Manager dashboard, assignment, floor-check workflow.
- Web app installable as a progressive web app on phones.
- Single tenant configuration, multi-tenant ready schema.

**Release 2: dealer group.**

- Multi-store tenant (dealer group with several rooftops), group-level reporting.
- Native mobile apps.
- CRM integration for outcome metrics and walk-away calibration.
- Phone and text roleplays with simulated texting.

**Release 3: general module.**

- Shared core plus industry packs for residential solar, insurance, real estate, and furniture or in-home retail.
- Self-serve onboarding for new dealerships and businesses.

### 2.5 Pricing assumption for the build

The build must support per-seat monthly pricing with a store-level minimum, because the closest competitor, DealSpeak, prices per user per month (its own blog lists conflicting figures of $30 and $59) and enterprise tools such as Second Nature reportedly start near $30 to $40 per seat with annual minimums. Billing is a release 2 feature; release 1 records seats and usage so billing can be added without schema changes.

## 3. Roles, permissions and tenancy

Every record belongs to exactly one tenant, every request is authorized against a role, and no query may ever return data from another tenant. The tenant is the dealer group; a store (rooftop) sits inside it; users belong to one or more stores.

### 3.1 Tenancy hierarchy

1. **Platform:** the service operator. Holds global content (the library in sections 8 and 9), model settings and feature flags.
2. **Tenant (dealer group):** for the pilot, Bomnin Automotive Group. Owns users, stores, recordings, scores, local content overrides and integrations. A single-store dealership is a tenant with one store.
3. **Store (rooftop):** a physical dealership with its own brand mix, fee schedule, add-on policy, lender list and language mix. Most settings in section 4 (fees, add-on removal policy, lenders) are store-level because they differ by rooftop.
4. **Team:** an optional grouping inside a store (for example, used car team, new car team, BDC). Managers can be assigned to teams.

Content resolves from most specific to least: store override, then tenant override, then platform default. A store can override a script line (for example, the exact name of its dealer fee) but cannot override a compliance rule to make it weaker. The rule engine rejects any override that removes or relaxes a rule marked `critical`.

### 3.2 Roles

| Role | Scope | Can | Cannot |
| --- | --- | --- | --- |
| Rep | Own data | Practice any assigned or open module; view own sessions, scores, recordings, behavior cards; set language preference | See other reps' data; change content; delete scored sessions |
| BDC agent | Own data | Same as rep, plus phone and text scenarios | Same as rep |
| Manager | Assigned teams or store | Everything a rep can do for themselves; view team scores and recordings; assign modules; run and record floor checks; add coaching notes; mark a session for review | Edit global content; change compliance rules; see other stores unless granted |
| General manager | Store or group | Everything a manager can do for the whole store or group; view compliance flags; export reports; configure store settings (fees, add-on policy, lender list, languages) | Change platform content; relax critical rules |
| Content editor | Tenant | Create and edit tenant content overrides; propose changes to platform content; approve Spanish lines; publish content versions to the tenant | Edit compliance rules marked critical; see recordings unless also a manager |
| Compliance reviewer | Tenant | Review flagged sessions; approve or reject content that touches pricing, add-ons, financing or deadlines; sign off on store fee configuration | Edit scores |
| Platform admin | Platform | Manage tenants, global content releases, models, flags, support access | Read tenant recordings without a logged, time-limited support grant approved by the tenant's general manager |

A user can hold several roles. Permissions are the union of their roles, scoped to the stores attached to each role.

### 3.3 Permission rules to implement

1. Authorization happens on the server for every request. The client hides buttons for convenience only.
2. Every database table that holds tenant data has a `tenant_id` column, and every query filters on it. Use row-level security in the database as a second line of defense, with policies keyed on the authenticated user's tenant.
3. Recordings and transcripts are readable by the rep who made them and by managers whose scope includes that rep. A rep can mark a session private for 24 hours; after that it is visible to their manager. This lets reps practice freely without every first attempt being watched, while still giving managers what they need. The window is a store setting (0 to 72 hours).
4. A manager cannot edit a rep's automated score. A manager can add a note and a manual override flag with a reason, both of which are logged and shown next to the original score.
5. Every read of a recording by someone other than its owner writes an audit log entry (who, when, which session).
6. Platform support access requires a time-limited grant (maximum 72 hours) approved inside the app by the tenant's general manager, and every action during the grant is audit logged.
7. Deleting a user anonymizes their personal fields but keeps aggregated scores for store reporting. Recordings follow the retention rules in section 20.

### 3.4 Store settings that drive behavior

These settings are required before a store can go live, because scripts and the compliance checker read them. The setup wizard (section 18) collects them, and the compliance reviewer signs off.

| Setting | Example | Used by |
| --- | --- | --- |
| Dealer fee name and amount (English and Spanish) | "Dealer fee $899" / "cargo de concesionario $899" | All-in quote lines, compliance checker |
| Other mandatory dealer charges | Pre-delivery service, electronic filing | All-in quote, out-the-door math |
| Government charges paid directly by the customer | Florida sales tax, tag, title, registration | Out-the-door explanation (excluded from the all-in price) |
| Add-on removal policy | "Credit the price" or "show same model without it" | Technique 120, objection 65 |
| Lenders used, including whether Credit Acceptance is used | List of lender names | Two-payment menu rule, finance scenarios |
| Languages offered | English, Spanish | Persona language mix |
| Spanish register default | Usted | Persona and model lines |
| Referral reward policy | None, gift, or cash (attorney-approved) | Technique 53 |
| Text-message consent process | How the store records consent | Phone and text scenarios |
| Brands sold and inventory feed | Chevrolet; used all makes | Scenario vehicles |
| Walk-in metric definition | All logged ups or qualified ups | Dashboards |
| Private practice window | 24 hours | Recording visibility |

## 4. Ground rules as code

The app enforces one rule above all others: **hardball yes, lies about facts no.** It is implemented in `packages/rules` as a rule engine that checks every utterance (rep speech, AI customer speech, demonstration lines, debrief text and content files) and returns violations with a rule id, severity, the offending span, and a bilingual explanation. This section is a starting rulebook built from research; a Florida dealer attorney must review it before launch (section 23). Nothing here is legal advice.

### 4.1 What is allowed (hardball)

The app actively teaches and rewards these, because they are firm without misstating facts:

- Anchoring with the real asking price and a reason for it.
- Not leading with the best number; holding back concessions.
- Trading every concession for a commitment ("If I get you X, are we doing this today?").
- Concessions in shrinking, earned steps with a reason at each.
- Real, showable urgency: a rebate with a published end date, a real single unit, a real rate change.
- Takeaways (offering a lower trim when the customer balks at price).
- Silence after presenting numbers.
- Manager turnover as a real second conversation.
- Asking for the decision once, clearly, at the right moment.
- Answering objections with questions, isolating the real concern, and naming the customer's fear of a wrong choice.

### 4.2 What is forbidden (lies about facts)

Each line is a rule family. Section 4.4 lists the individual rules.

| Family | Forbidden | Why |
| --- | --- | --- |
| Price | Quoting a price that leaves out any mandatory dealer charge; quoting by phone or text a price that is not the full walk-in price; leading with a price that only some buyers qualify for; tying a price to dealer financing | Florida s. 501.976(16) and (11); FTC pricing guidance (September 15, 2026); Lindsay settlement |
| Payment | Quoting a payment that includes add-ons without saying so; stretching the term to hide add-on cost; quoting a payment above the contract amount and filling the gap (payment packing) | FTC Asbury and Napleton complaints; Credit Acceptance decree |
| Add-ons | Saying or implying an optional product is required for approval or the rate; describing a pre-installed option as impossible to remove; calling a charged item free; adding any item without explicit consent | Florida s. 634.121 notice; FTC guidance; Manchester City Nissan |
| Rate and approval | Misstating a rate, an approval, or a lender requirement; spot delivery on an approval that has not happened | Agreed rule |
| Trade value | Misstating the trade appraisal or its basis; hidden conditions on the trade number | Agreed rule; contingent terms must be explicit |
| Deadlines | Any deadline that cannot be shown (invented end dates, "price goes up tomorrow" without proof) | Agreed rule; deadline research supports only real deadlines |
| Availability | Inventing scarcity or another buyer; not disclosing that a vehicle is in transit or off the lot | FTC guidance |
| Authority | Claiming a manager limit that is not real ("he won't go a dollar more"); a staged manager trip that returns with a false story | Agreed rule; Friedman's "To the Bone" close is excluded |
| Cancellation | Telling a customer they can cancel a car purchase within three days | No federal cooling-off right at the dealership |
| Language | Stating conditions in a different language from the offer; a different deal in Spanish than in English | FTC Cowboy Toyota order; California Civil Code 1632 as reference |
| Coercion | Holding keys or a license; keeping a customer until they sign | Agreed rule |
| Fake identity | Inventing a shared hometown, school or contact | Misuse of the unity principle |
| Credit and fairness | Different offers or pricing methods by language or ethnicity | Asbury allegations; app's equal-treatment rule |
| Reviews | Asking only happy customers for reviews; rewarding positive reviews | Federal consumer review rules (attorney to confirm) |
| Consent | Texting or leaving automated voicemail without documented consent | TCPA flag (attorney to confirm) |

### 4.3 How the rule engine works

1. **Inputs.** An utterance (text, from speech recognition or content), its language, its speaker role (rep, customer, demonstrator, debrief), and a scenario context object holding the true facts: vehicle price, every dealer fee, government charges, real deadlines with proof, real inventory count, real rebates and who qualifies, lender approval state, trade appraisal and its basis, add-ons present and whether removable per store policy.
2. **Two layers.** Layer one is deterministic: pattern and number checks against the scenario facts (for example, any dollar figure the rep calls a price is compared with the true all-in price; any date the rep calls a deadline is compared with the real deadlines list). Layer two is a language model classifier for meaning that patterns miss (for example, implying an add-on is required without the word "required"). Layer two runs with a fixed prompt, temperature 0, returns structured JSON, and is evaluated against the test suite in section 21.
3. **Facts first.** A statement is only a violation if it conflicts with the scenario's true facts. "The rebate ends Monday" passes when the scenario holds a real rebate ending Monday with a bulletin, and fails otherwise. This is what makes hardball allowed and lies forbidden in the same engine.
4. **Severity.** `critical` (automatic session fail, shown first in the debrief), `major` (large score deduction), `minor` (coaching note only).
5. **Output.** For each violation: rule id, severity, span in the transcript, the true fact it conflicts with, and a bilingual explanation plus the compliant alternative line from the library.
6. **Content checks.** The same engine runs on every content file in CI. A technique, demonstration or persona line that violates a critical rule blocks the build.
7. **AI customer checks.** The AI customer's lines are checked too. If the model generates a line that coaches a violation or states a false fact about the vehicle, the line is regenerated before it is spoken, and the incident is logged.

### 4.4 Starting rulebook

| Id | Rule | Severity | Check |
| --- | --- | --- | --- |
| PRICE-01 | Any stated vehicle price equals the all-in price (every mandatory dealer charge included; only government charges paid directly by the customer excluded) | critical | Number compare against scenario facts |
| PRICE-02 | Phone and text prices follow PRICE-01 | critical | Channel-aware number compare |
| PRICE-03 | First price stated is one any customer can pay; qualifying discounts come after | major | Order check plus rebate eligibility facts |
| PRICE-04 | Price is never conditioned on dealer financing | critical | Classifier |
| PRICE-05 | Total is stated before itemizing | minor | Order check |
| PAY-01 | Any payment with add-ons is labeled as including them | critical | Number compare with and without add-ons |
| PAY-02 | When add-ons are presented, payment is shown with and without them | major | Presence check (two-payment menu) |
| PAY-03 | Term is not lengthened to absorb add-ons without saying so | critical | Term compare |
| ADD-01 | No optional product is described as required for approval, rate or delivery | critical | Classifier, both languages |
| ADD-02 | No pre-installed option is described as impossible to remove; the store's removal policy is offered | critical | Classifier plus store policy |
| ADD-03 | Nothing charged is called free | critical | Classifier |
| ADD-04 | Service contracts are described as optional and cancellable within 60 days in Florida | major | Presence check in finance scenarios |
| RATE-01 | Rates and approvals match scenario facts | critical | Number and state compare |
| TRADE-01 | Trade value and its basis match the appraisal | critical | Number compare |
| TRADE-02 | Any condition on the trade number is stated explicitly, in the language of the offer | major | Classifier |
| DEAD-01 | Every stated deadline exists in the scenario's real deadlines with proof | critical | Date compare |
| AVAIL-01 | Scarcity or competing-buyer claims match inventory facts | critical | Count compare |
| AVAIL-02 | In-transit or off-lot vehicles are disclosed when discussed | major | Facts flag |
| AUTH-01 | Claims about a manager's limit match scenario facts | critical | Classifier plus facts |
| CANCEL-01 | No claim of a three-day right to cancel a vehicle purchase in Florida | critical | Pattern plus classifier |
| LANG-01 | Conditions are stated in the same language as the offer | major | Language detection per clause |
| FAIR-01 | Same offer method and pricing regardless of language | critical | Cross-language comparison in content; manager review in live sessions |
| COERCE-01 | No threat to hold keys, license or the customer | critical | Classifier |
| ID-01 | No invented shared identity (scenario holds the rep's real profile) | major | Facts compare |
| REVIEW-01 | Review requests are not limited to satisfied customers and offer no reward for positive reviews | major | Classifier |
| CONSENT-01 | Texts and voicemails reference documented consent in phone scenarios | major | Presence check |

### 4.5 Rules that depend on people

The following must be confirmed by the store's Florida dealer attorney and recorded in the store settings before go-live: which charges count as government charges paid directly by the consumer; the exact pre-delivery fee wording; the add-on removal remedy; whether paid customer referrals are allowed; the text-message consent wording; whether Credit Acceptance terms apply to the store's deals; and the continued legal footing of the equal-treatment rule after the FTC and CFPB dropped disparate-impact theories in 2026. Until then, the app runs with the strictest version of each rule.

## 5. System architecture and technology stack

The system is a TypeScript monorepo with a Next.js web app, a separate real-time voice gateway, a background worker for scoring, and a Postgres database, with the Anthropic Claude API driving the AI customer, the compliance classifier and the scoring judge. Speech recognition and speech synthesis are pluggable providers chosen by the bake-off in section 11, because code-switched Miami Spanish is the hardest technical risk in the product.

### 5.1 Components

1. **Web app (`apps/web`).** Next.js with the App Router, React, TypeScript, Tailwind. Server components for dashboards and content pages; client components for the practice room. Installable as a progressive web app so reps can add it to a phone home screen. Handles authentication, all non-real-time APIs, content browsing, dashboards and settings.
2. **Voice gateway (`services/voice`).** A Node.js service holding one WebSocket per live session. It receives microphone audio from the browser, streams it to the speech recognition provider, detects end of turn, calls the AI customer, runs the compliance check on both sides, streams the customer's reply to speech synthesis, and streams audio back. It must be stateless between sessions and horizontally scalable; session state lives in Redis while live and in Postgres when finished.
3. **Worker (`services/worker`).** A queue consumer (BullMQ on Redis, or the platform's queue) that runs post-session jobs: full transcript scoring, rubric evaluation, debrief generation, behavior card selection, manager notifications, analytics rollups, content validation and nightly calibration jobs.
4. **Database (`packages/db`).** Postgres 16 or later with row-level security, migrations via Prisma or Drizzle. Schema in section 6.
5. **Object storage.** S3-compatible storage for session audio, encrypted at rest, with signed short-lived URLs for playback.
6. **Content package (`packages/content`).** Content files (sections 7 to 9) plus Zod schemas, a loader, and a CI validator.
7. **Rules package (`packages/rules`).** The compliance engine in section 4.
8. **Scoring package (`packages/scoring`).** The rubric engine in section 13.
9. **Internationalization package (`packages/i18n`).** UI strings in English and Spanish, the glossary (section 16), and language detection helpers.

### 5.2 Request flow for one practice turn

1. The rep's browser captures microphone audio (16 kHz mono PCM or Opus) and streams it over the WebSocket.
2. The gateway streams audio to speech recognition with the session's language hints (English, Spanish, or both) and custom vocabulary from the glossary ("el down", "trade-in", "dealer fee", "co-firmante", vehicle model names).
3. End-of-turn detection fires (voice activity silence of about 700 milliseconds plus the provider's end-of-utterance signal). The gateway also records the rep's pause length before answering an objection, speaking rate and volume for scoring.
4. The final transcript of the rep's turn goes to the rule engine's deterministic layer immediately (under 20 milliseconds) and to the classifier layer asynchronously.
5. The gateway calls the AI customer (section 10) with the persona, scenario state, conversation so far, and the scenario engine's current instructions (for example, "reveal hidden concern if unlock condition met" or "walk-away triggered"). The reply streams back token by token.
6. Each customer sentence is compliance-checked as it completes, then sent to speech synthesis, and audio streams to the browser. Streaming sentence by sentence keeps latency low.
7. When the session ends, the gateway writes the transcript, audio pointers, timing data and live flags to Postgres and enqueues a scoring job.
8. The worker scores the session, writes the debrief, picks the behavior card, and notifies the rep and, if configured, the manager.

### 5.3 Model choices

- **AI customer:** Claude, a fast, high-quality model (for example `claude-sonnet-5-5`), streaming, temperature about 0.8 for natural variation, with strict persona and scenario prompts. Verify current model names against Anthropic's documentation at build time; model strings in this spec are examples.
- **Live compliance classifier:** a fast, low-cost Claude model (for example `claude-haiku-5-5`), structured JSON output. Haiku 5.5 takes no temperature (a non-default value returns a 400); repeatability comes from the fixed prompt and schema (decision 0006).
- **Post-session scoring judge and debrief writer:** the most capable available Claude model (for example `claude-opus-5-5`), temperature 0, structured output, run against the full transcript and the rubric. Latency is not critical here (target under 60 seconds).
- Every model call is wrapped in one client in `packages/ai` with retries, timeouts, token and cost logging per tenant, and a kill switch per model. Prompts live in versioned files, not inline strings.
- Never send the rep's personal data (name, phone, email) to a model. Sessions use a pseudonymous id; the rep's first name may be passed only if the persona needs to say it, and the store setting allows it.

### 5.4 Speech providers

Speech recognition must handle English, Spanish, and mixed English-Spanish speech with Caribbean and South American accents. Research found the best 2024 model still had a 48% word error rate on mixed Spanish-English speech from Miami speakers (Miami Bangor corpus benchmark), so scoring must judge meaning, not exact words, and provider choice must come from a local test (section 11), not from vendor claims. Build a provider interface (`SpeechToText`, `TextToSpeech`) with at least two implementations so the provider can change without touching session logic.

Speech synthesis needs natural U.S. English voices and natural Latin American Spanish voices suited to Miami (Cuban, Venezuelan, Colombian and general Caribbean accents preferred over Castilian), with low first-audio latency and streaming. Each persona has a voice id per language.

### 5.5 Hosting and operations

- Web app on a managed Next.js host or containers; voice gateway on containers with WebSocket support close to the speech providers' regions (U.S. East for Miami).
- Postgres managed with point-in-time recovery; Redis managed.
- Observability: structured logs, traces across gateway, model and speech calls, latency dashboards per stage (recognition, model first token, synthesis first audio), error tracking, and per-tenant cost dashboards.
- Feature flags for every new module and model change.
- Environments: development, staging (with synthetic tenant and seeded content), production.

### 5.6 Performance budgets

| Stage | Budget (median) | Budget (95th percentile) |
| --- | --- | --- |
| End of rep speech detected to final transcript | 300 ms | 600 ms |
| Transcript to customer model first token | 400 ms | 900 ms |
| First sentence to first synthesized audio | 300 ms | 700 ms |
| Total turn latency | 1.0 to 1.2 s | 2.5 s |
| Post-session scoring complete | 30 s | 90 s |
| Dashboard page load | 1 s | 2.5 s |

## 6. Data model

The database separates three kinds of data: tenant structure and people, published content (versioned and read-only at runtime), and practice activity (sessions, turns, scores, floor checks). Every tenant-owned table has `id` (UUID), `tenant_id`, `created_at`, `updated_at`, and row-level security on `tenant_id`.

### 6.1 Tenant and people

| Table | Key fields | Notes |
| --- | --- | --- |
| `tenants` | name, plan, status, default\_language | Dealer group |
| `stores` | tenant\_id, name, address, timezone (America/New\_York for Miami), brands\[\], settings JSON (section 3.4) | Settings validated by a Zod schema; changes audit logged |
| `teams` | store\_id, name, kind (new, used, BDC, finance) | Optional |
| `users` | tenant\_id, auth\_id, first\_name, last\_name, email, phone, preferred\_language (en, es), spanish\_register (usted, tu), hire\_date, status | Personal data; never sent to models |
| `memberships` | user\_id, store\_id, team\_id, role | One row per role per store |
| `store_fees` | store\_id, code, name\_en, name\_es, amount\_cents, kind (dealer\_mandatory, government\_customer\_pays, optional), effective\_from, approved\_by | Drives PRICE rules |
| `store_policies` | store\_id, add\_on\_removal (credit\_price, show\_alternative, none\_configured), referral\_reward (none, gift, cash), text\_consent\_text\_en, text\_consent\_text\_es, approved\_by, approved\_at | Compliance reviewer signs |
| `store_lenders` | store\_id, name, is\_credit\_acceptance | Two-payment menu rule |

### 6.2 Content (published, versioned)

Content is authored in files (section 7), validated, and published as an immutable `content_release`. Runtime reads only published releases. Each row references `release_id`.

| Table | Key fields |
| --- | --- |
| `content_releases` | version (semantic), scope (platform, tenant, store), scope\_id, published\_by, published\_at, changelog |
| `techniques` | release\_id, code (T001 to T122), name\_en, name\_es, family, stage\[\], when\_en, when\_es, line\_en, line\_es, flawed\_line\_en, flawed\_line\_es, why\_en, why\_es, evidence\_grade (A to D), evidence\_note, sources\[\], compliance\_notes, rubric\_items\[\], status (active, retired, needs\_store\_policy) |
| `objections` | release\_id, code (O01 to O65), says\_en, says\_es, behind\_en, behind\_es, core\_move\_technique\_codes\[\], module, frequency\_weight |
| `personas` | release\_id, code, name, age\_range, language\_mix, temperament, situation JSON, stated\_objection\_code, hidden\_truth\_en, hidden\_truth\_es, unlock\_conditions\[\], walk\_out\_triggers\[\], win\_condition, voice\_ids JSON, difficulty (1 to 3) |
| `scenarios` | release\_id, code, module, title\_en, title\_es, persona\_code, facts JSON (vehicle, fees, deadlines, inventory, rebates, trade, lender state, add-ons), target\_technique\_codes\[\], rubric\_code, exit\_policy JSON (walk-away and not-now base rates), max\_turns, channel (floor, phone, text) |
| `rubrics` | release\_id, code, items JSON (section 13), pass\_threshold |
| `rules` | release\_id, code, severity, description\_en, description\_es, check\_kind, parameters JSON |
| `glossary_terms` | release\_id, en, es\_standard, es\_miami, avoid\[\], notes, verified (bool) |
| `behavior_cards` | release\_id, code, technique\_code, title\_en, title\_es, floor\_check\_script\_en, floor\_check\_script\_es, look\_for\[\], duration\_seconds |
| `modules` | release\_id, code, title\_en, title\_es, ordered scenario codes, certification flag |

### 6.3 Practice activity

| Table | Key fields | Notes |
| --- | --- | --- |
| `assignments` | user\_id, module\_code or scenario\_code, assigned\_by, due\_at, reason | Manager-created |
| `sessions` | user\_id, store\_id, scenario\_code, release\_id, language, mode (demo, practice, certification), channel, started\_at, ended\_at, end\_reason (sale, next\_step, walk\_away, not\_now, timeout, abandoned), private\_until, audio\_key | Release pinned so scores stay reproducible |
| `turns` | session\_id, index, speaker (rep, customer), text, language\_detected, started\_ms, ended\_ms, pause\_before\_ms, words\_per\_minute, volume\_db\_mean, asr\_confidence | Timing feeds scoring |
| `scenario_state_events` | session\_id, turn\_index, event (hidden\_revealed, walk\_away\_triggered, not\_now\_triggered, unlock\_met, trigger\_hit), detail JSON | Engine audit trail |
| `violations` | session\_id, turn\_index, rule\_code, severity, span, true\_fact, layer (deterministic, classifier), confirmed\_by\_reviewer | Compliance |
| `scores` | session\_id, rubric\_code, total, passed, items JSON (item code, points, max, evidence span, explanation\_en, explanation\_es), judge\_model, judge\_prompt\_version | Immutable after write |
| `score_overrides` | score\_id, manager\_id, reason, flag | Never edits the score |
| `debriefs` | session\_id, worked\_en, worked\_es, change\_en, change\_es, replay\_turn\_index, why\_en, why\_es | AI explains the why |
| `behavior_card_issues` | user\_id, card\_code, session\_id, issued\_at, due\_week, status (open, checked, missed) | One per week |
| `floor_checks` | card\_issue\_id, manager\_id, checked\_at, observed (yes, partly, no), note, duration\_seconds | Manager loop |
| `manager_check_quality` | floor\_check\_id, script\_followed (bool), specific\_feedback (bool), time\_to\_feedback\_hours | Section 14 |
| `certifications` | user\_id, module\_code, level, earned\_at, expires\_at | Quarterly recertification |
| `crm_outcomes` | store\_id, period, metric, value, source | Release 2 integration |
| `audit_log` | actor\_id, action, target\_type, target\_id, at, detail JSON | Append-only |

### 6.4 Data rules

1. Money is stored in integer cents. Never use floating point for money.
2. Times are stored in UTC and displayed in the store's time zone.
3. Content rows are never edited after publishing; a change creates a new release.
4. A session always references the exact content release it ran on, so a score can be recomputed and explained later.
5. Bilingual fields come in pairs (`_en`, `_es`). A CI check fails if any published content row has one side empty, unless the row is marked `language_specific` with a reason (for example, a Spanish-only objection such as "Mi hijo me traduce").

## 7. Content library format and pipeline

All training content lives as YAML files in `packages/content/library/`, one file per item, validated by Zod schemas in CI and published as immutable releases. This lets non-engineers edit content through a review process, keeps both languages side by side, and makes every score reproducible.

### 7.1 Folder layout

```text
packages/content/library/
  techniques/T001-pause.yaml ... T122-graceful-not-now.yaml
  objections/O01-talk-to-spouse.yaml ... O65-preinstalled-package.yaml
  personas/P-partner-check.yaml ...
  scenarios/car/S-partner-check-L1.yaml ...
  rubrics/R-core.yaml, R-objection.yaml, R-phone.yaml, R-finance.yaml, R-delivery.yaml
  rules/PRICE-01.yaml ...
  behavior-cards/B-T002-clarify.yaml ...
  modules/M-onboarding-30.yaml ...
  glossary/terms.yaml
  packs/solar/, packs/insurance/, packs/real-estate/, packs/furniture/
```

### 7.2 Technique file schema (example)

```yaml
code: T121
slug: two-payment-menu
name: { en: "Two-payment menu", es: "Menú de dos pagos" }
family: finance_handoff
stages: [numbers, finance]
when: { en: "Presenting any optional protection product", es: "Al presentar cualquier producto de protección opcional" }
model_line:
  en: "With the protection products, $A a month. Without them, $B. They are optional. Which would you like?"
  es: "Con los productos de protección, $A al mes. Sin ellos, $B. Son opcionales. ¿Cuál prefiere?"
flawed_line:
  en: "Your payment is $A a month, and that includes the protection you'll need."
  es: "Su pago es $A al mes, y eso incluye la protección que va a necesitar."
why:
  en: "Shows the true cost of each option and gives the customer a real choice, which regulators now require for some lenders."
  es: "Muestra el costo real de cada opción y le da al cliente una decisión real, algo que ahora se exige con algunos prestamistas."
evidence: { grade: A, note: "Credit Acceptance consent decree, effective Nov 2, 2026" }
sources: ["https://www.ir.creditacceptance.com/static-files/bc0ecc18-3976-42f0-95c6-da2a651aa771"]
placeholders: [A, B]   # filled from scenario facts at runtime, never invented
rubric_items: [PAY-02-present, offer-choice]
compliance: [PAY-01, PAY-02, ADD-01]
requires_store_policy: false
spanish_reviewed: false
```

Rules for every technique file: `$`-placeholders are filled only from scenario facts or store settings, never from the model; `spanish_reviewed` stays false until a Miami native speaker approves the Spanish (section 16); `evidence.grade` uses A (law, regulator, binding decree or meta-analysis), B (single peer-reviewed study or large dataset), C (preprint, credible secondary source, industry survey) or D (vendor claim or practitioner tradition).

### 7.3 Persona and scenario schemas

A persona defines who the customer is; a scenario places that persona in a specific deal with true facts. Section 10 defines the fields in detail. Every scenario file must contain a complete `facts` block, because the rule engine checks rep statements against it.

```yaml
code: S-partner-check-L1
module: car-core
persona: P-partner-check
channel: floor
language_options: [en, es]
difficulty: 1
facts:
  vehicle: { year: 2026, make: Chevrolet, model: Equinox, trim: LT, stock: "4521", in_stock: true }
  price_cents: 3245000
  dealer_fees: [{ code: dealer_fee, cents: 89900 }]
  government_charges_customer_pays: [sales_tax, tag, title]
  all_in_price_cents: 3334900
  rebates: [{ name: "Bonus cash", cents: 100000, eligibility: everyone, ends: 2026-10-31, proof: "OEM bulletin 26-114" }]
  deadlines: [{ what: "Bonus cash", date: 2026-10-31, proof: "OEM bulletin 26-114" }]
  inventory_same_trim_color: 3
  trade: { vehicle: "2015 Malibu", appraisal_cents: 0, payoff_cents: 0 }
  lender_state: not_applied
  add_ons: []
  customer_budget_told_spouse_cents: 52000
  quoted_payment_cents: 58000
target_techniques: [T001, T002, T003, T005, T013, T014, T092]
rubric: R-objection
exit_policy: { walk_away_base: 0.10, not_now_base: 0.25, triggers_raise_by: 0.25 }
max_turns: 24
```

### 7.4 Authoring and publishing workflow

1. An editor changes or adds a file on a branch (or through the in-app content editor, which writes the same YAML through the API).
2. CI runs: schema validation, bilingual completeness, placeholder check (every placeholder resolvable from scenario facts), the compliance rule engine on every model line, persona line and demonstration, and a link check on sources.
3. Any change touching price, payment, add-ons, rates, deadlines or availability requires approval from a user with the compliance reviewer role.
4. Any change to Spanish text resets `spanish_reviewed` to false and requires approval from a designated Spanish reviewer.
5. Publishing creates a `content_release` with a changelog. Tenants and stores receive platform releases automatically unless they pin a version.
6. Retiring content marks it `retired`; it disappears from assignment but stays readable for old sessions.

### 7.5 Content counts at first release

| Content | Count | Source |
| --- | --- | --- |
| Techniques | 122 | Section 8 |
| Objections and customer types | 65 | Section 9 |
| Personas | At least 30 at launch, growing to one or more per objection | Section 10 |
| Car scenarios | At least 20 at launch, 65 by release 2 (one per objection at level 1) | Section 10 |
| Rubrics | 5 (core, objection, phone, finance, delivery) | Section 13 |
| Compliance rules | 26 | Section 4.4 |
| Behavior cards | One per technique that has an observable floor behavior (about 90) | Section 14 |

## 8. Content library: the 122 techniques

These 122 techniques are the full library from twelve research passes, each with a model line in English and Spanish and an evidence grade. Load them as content files (section 7); never hard-code them. Grades: **A** law, regulator text, binding decree or meta-analysis; **B** single peer-reviewed study or large dataset; **C** preprint, credible secondary source or industry survey; **D** practitioner tradition or vendor claim. Spanish lines are drafts for Miami usage in the usted register and stay marked `spanish_reviewed: false` until a native speaker approves them (section 16). Dollar figures inside lines are examples; at runtime they are filled from scenario facts.

### 8.1 How each technique is used in the app

1. **Demonstration.** The app plays a short good model and a flawed model of the technique, because a meta-analysis of 117 behavior-modeling studies found transfer to the job was greatest when trainees saw both (Taylor, Russ-Eft and Chan, 2005). The flawed model is written by content editors following the pattern for the technique's family in 8.8; it must break the technique's behavior without breaking a compliance rule unless the lesson is about that rule.
2. **Roleplay.** Scenarios list target techniques; the scoring rubric checks whether the rep used them.
3. **Debrief.** The AI explains why the technique matters (the "why" field); the manager's floor check shows exactly how (section 14). Research found step-by-step coaching helped when a manager gave it and had little or negative effect when an AI gave it (Casenave and others, 2025).
4. **Library.** Reps and managers can browse every technique with its grade, source and lines.

### 8.2 Core objection sequence and discovery (T001 to T014)

Every objection roleplay uses the sequence pause, clarify, acknowledge, isolate, respond, confirm (T001, T002, T003, T005, then the specific move, then T010).

| Code | Technique | When | English model line | Spanish model line | Grade |
| --- | --- | --- | --- | --- | --- |
| T001 | Pause and slow down | The instant any objection lands | (Two to three seconds of silence, then a calm reply at normal pace.) | (Dos o tres segundos de silencio y luego una respuesta tranquila, sin apurarse.) | B: Gong, 67,000+ demos; top reps held about 176 words a minute after objections, average reps sped to about 188 |
| T002 | Clarify with a question | Before answering any objection | "Help me understand. When you say the payment is high, what number were you expecting?" | "Ayúdeme a entender. Cuando dice que el pago está alto, ¿qué número tenía en mente?" | B: Gong; top performers answered objections with a question 54.3% of the time, average 31.0% |
| T003 | Acknowledge | Right after the pause | "That is fair. It is a big decision." | "Tiene toda la razón. Es una decisión importante." | D |
| T004 | Label the concern | Emotion is ahead of logic | "It sounds like the trade number caught you off guard." | "Parece que el número del trade-in lo tomó por sorpresa." | D: Voss |
| T005 | Isolate | The stated objection may not be the real one | "Other than talking it over at home, is anything about the car or the numbers holding you back?" | "Aparte de hablarlo en casa, ¿hay algo del carro o de los números que lo detenga?" | D; supported by the stated-versus-real-reason data |
| T006 | Discovery questions | Discovery, and whenever guessing | "What do you like least about what you are driving now?" | "¿Qué es lo que menos le gusta del carro que maneja ahora?" | B: Rackham, 35,000 calls |
| T007 | Summarize and confirm | End of discovery, before numbers | "So you need three rows, under $600 a month, by the end of the month. Did I get that right?" | "Entonces necesita tres filas, menos de $600 al mes, para fin de mes. ¿Lo entendí bien?" | D |
| T008 | Tie feature to stated need | Walkaround | "You said your mother has trouble climbing in. Watch how low this step is." | "Usted me dijo que a su mamá le cuesta subirse. Mire lo bajito que está este escalón." | D |
| T009 | Transparent numbers | Presenting figures | (Price, trade, fees and payment on one sheet, then stop talking.) | (Precio, trade-in, cargos y pago en una sola hoja, y luego silencio.) | B: Cox Automotive satisfaction drivers |
| T010 | Trial close | After the drive and each resolved objection | "If we can get the numbers where you need them, is this the one?" | "Si logramos que los números le cuadren, ¿es este el carro?" | D |
| T011 | Choice of two | Close but stuck | "Would the 60 or the 72 month term sit better with your budget?" | "¿Le acomoda más el plazo de 60 o el de 72 meses?" | D |
| T012 | True third-party story | Fear of a mistake | "A customer last month had the same worry. Here is what she did." (Real stories only.) | "Una clienta el mes pasado tenía la misma duda. Le cuento lo que hizo." (Solo historias reales.) | C: social proof research |
| T013 | Bring in the absent decision-maker | Partner or parent not present | "Want to video call them now so they can see it?" | "¿Quiere hacerle una videollamada ahora para que lo vea?" | D |
| T014 | Firm next step | Any customer who is leaving | "Does tomorrow at 5:30 or Saturday at 10 work better for you both?" | "¿Les queda mejor mañana a las 5:30 o el sábado a las 10?" | D |

### 8.3 Negotiation and holding gross (T015 to T022)

| Code | Technique | When | English model line | Spanish model line | Grade |
| --- | --- | --- | --- | --- | --- |
| T015 | Anchor with the real price and a reason | First number | "This one is $38,450, everything included but tax and tags. Here is why it is priced there." | "Este está en $38,450, todo incluido menos impuestos y placas. Le explico por qué tiene ese precio." | A: 2025 meta-analysis of 90 studies; ambitious openings win about 75% of the time but cause more walkaways and worse feelings, and the effect shrinks in complex deals |
| T016 | Silence after the number | Right after presenting figures | (Present, then say nothing until the customer speaks.) | (Presentar y no decir nada hasta que el cliente hable.) | D |
| T017 | Sell value before discounting | First price pushback | "Compared to what? Walk me through what you are seeing elsewhere." | "¿Comparado con qué? Cuénteme lo que ha visto en otros lados." | D |
| T018 | Trade, never give | Any request for a concession | "If I can get my manager to $575 a month, are you taking it home today?" | "Si consigo que mi gerente lo deje en $575 al mes, ¿se lo lleva hoy?" | D |
| T019 | Small concessions, shrinking | Multiple rounds | (Each move smaller than the last, with a reason; see T106.) | (Cada paso más pequeño que el anterior y con una razón; ver T106.) | B: Kwon and Weingart 2004 |
| T020 | Real urgency | A true, showable deadline or scarce unit | "The $1,500 rebate ends Monday. Here is the bulletin." | "El reembolso de $1,500 vence el lunes. Aquí tiene el boletín." | B: Gino and Moore 2008 (real deadlines only) |
| T021 | Takeaway | Wants top trim at base price | "Maybe this trim is more than you need. Want to see the one below it?" | "A lo mejor esta versión es más de lo que necesita. ¿Quiere ver la de abajo?" | D |
| T022 | Shrink the gap | Small difference left | "We are $30 a month apart. That is about a dollar a day for the one you actually want." | "Estamos a $30 al mes. Es como un dólar al día por el que de verdad quiere." | B: Gourville; per-day framing works only for small amounts |

### 8.4 Research-backed closing, ownership and follow-up (T023 to T039)

| Code | Technique | When | English model line | Spanish model line | Grade |
| --- | --- | --- | --- | --- | --- |
| T023 | One well-timed close | After needs are confirmed | "You said third row and under $650. This does both. Want me to get it ready?" | "Usted dijo tercera fila y menos de $650. Este cumple con las dos. ¿Se lo preparo?" | B: Rackham photo-store study; closing training cut success on higher-value goods from 42% to 33% |
| T024 | Implication questions | Discovery | "When the van is in the shop, what does that do to your week?" | "Cuando la van está en el taller, ¿cómo le afecta la semana?" | B: Rackham |
| T025 | Need-payoff questions | Late discovery | "If you never had to borrow your sister's car again, what would that be worth?" | "Si nunca más tuviera que pedirle el carro a su hermana, ¿cuánto valdría eso para usted?" | B: Rackham |
| T026 | Summary close | Default way to ask | (Recap each need the car meets, then ask once.) | (Repasar cada necesidad que cumple el carro y preguntar una sola vez.) | D, consistent with Rackham |
| T027 | Precise number with a reason | First pencil, trade offer | "Your trade comes in at $14,850. Here is the auction data behind it." | "Su trade-in sale en $14,850. Aquí están los datos de subasta que lo respaldan." | B: Mason and others 2013 |
| T028 | Counter a low anchor by refocusing | "Another dealer is cheaper" | "Set that number aside a second. Let's compare total out-the-door and what is on the lot today." | "Dejemos ese número a un lado un momento. Comparemos el precio total y lo que hay en el lote hoy." | B: Galinsky and Mussweiler 2001 |
| T029 | Trade-value walkthrough | "You are low on my trade" | "Here are the three closest auction sales and the $1,100 in tires and brakes it needs." | "Aquí tiene las tres ventas de subasta más parecidas y los $1,100 de gomas y frenos que necesita." | C: J.D. Power 2025 SSI; deal satisfaction 800 when explained versus 672 |
| T030 | Out-the-door first | Every price conversation | "Out the door with doc fee, tag and tax, it is $38,912. Now, how do you want to pay for it?" | "El precio total con el cargo de documentación, placa e impuestos es $38,912. ¿Cómo lo quiere pagar?" | A: Florida s. 501.976; FTC 2026 |
| T031 | "You are free to say no" | Test-drive ask, close, takeaway | "Totally your call, and you are free to walk away. Would you take it around the block first?" | "Usted decide, y está en libertad de irse. ¿Le da una vuelta primero?" | A: meta-analysis of 42 studies (small effect) |
| T032 | Mirror the last words | Any stall | Customer: "I just don't want to get stuck." Rep: "Stuck?" | Cliente: "No quiero quedarme atrapado." Vendedor: "¿Atrapado?" | C: contested; a 2021 replication found no gain |
| T033 | Hands on the car early | Greeting through drive | "Go ahead, set the seat and mirrors how you would have them." | "Adelante, ajuste el asiento y los espejos como usted los tendría." | B: Peck and Shu 2009 |
| T034 | Take-home drive | Close but unsure | (Extended or overnight drive with clear return terms.) | (Prueba extendida o de una noche con condiciones claras de devolución.) | C |
| T035 | Word picture on the phone | Phone and internet leads | "Picture the cooled seats in August traffic on the Palmetto." | "Imagínese los asientos ventilados en el tráfico de agosto en el Palmetto." | B: Peck, Barger and Webb 2013 |
| T036 | Five-minute callback | Every web lead | "Hi Maria, you just asked about the white Highlander. I am standing next to it. Got a minute?" | "Hola, María, usted acaba de preguntar por la Highlander blanca. Estoy al lado de ella. ¿Tiene un minuto?" | B: lead response study, 100,000+ call attempts (measured contact, not sales) |
| T037 | Early manager introduction | After the drive, before numbers | "I would like you to meet Carlos, our sales manager." | "Le quiero presentar a Carlos, nuestro gerente de ventas." | D: consultant data, unaudited |
| T038 | Teach something new | Well-researched buyers | (Share one verified fact that changes how they compare two cars.) | (Compartir un dato verificado que cambie cómo comparan dos carros.) | C: Challenger research, business-to-business |
| T039 | Scheduled feature follow-up | Two to three weeks after delivery | "I will call on the 14th to set up the driver profiles we skipped." | "Lo llamo el 14 para configurar los perfiles de conductor que nos faltaron." | B: J.D. Power 2025; 22% want it and 53% of those never get it |

### 8.5 Language, trust, finance handoff and referrals (T040 to T055)

| Code | Technique | When | English model line | Spanish model line | Grade |
| --- | --- | --- | --- | --- | --- |
| T040 | Ask language preference | First two minutes, and before financing | "Happy to do this in English or Spanish. Which works better for you, paperwork included?" | "Con mucho gusto lo atendemos en español o en inglés. ¿Cómo prefiere que hagamos todo, incluyendo los papeles?" | B: service-encounter research; using the preferred language from the start beats switching later |
| T041 | Same deal in both languages | A wary Spanish-speaking buyer | "English or Spanish, it is the same price, same terms, same paperwork." | "En inglés o en español, es el mismo precio, las mismas condiciones y los mismos papeles." | B: FTC Cowboy Toyota order; dealer case |
| T042 | Visible concession ladder | "¿Ese es su último precio?" | "I do not have much room, but let me show you what I can do and what I would need from you." | "No tengo mucho margen, pero déjeme enseñarle lo que sí puedo hacer y qué necesitaría de su parte." | C: Ogliastri, 1,500 business interviews; test, do not assume |
| T043 | Package trade | Buyer keeps reopening single items | "Let's look at it all together: price, your trade and the extras." | "Veamos todo junto: el precio, su trade-in y los extras." | C: Ogliastri |
| T044 | Conditional commitment | Buyer names one obstacle | "If I can find it in blue, is that the one you take home today?" | "Si se lo consigo en azul, ¿es el que se llevaría hoy?" | D: Alex Dey (summaries) |
| T045 | Raise the known objection first | A fee or wait they will hit anyway | "You will see a dealer fee on the sheet. Let me explain it now so nothing surprises you." | "En la hoja va a ver un cargo de concesionario. Se lo explico ahora para que no haya sorpresas." | D |
| T046 | Cheaper alternative before the drive | Budget-sensitive buyer | "Before we drive, look at the LX too, so you can compare." | "Antes de manejar, mire también el LX, para que compare." | D |
| T047 | Pros and cons on paper | Analytical buyer stuck between two | "Let's put it on paper: for and against. You write, I will keep quiet." | "Pongámoslo en papel: a favor y en contra. Usted escribe y yo me quedo callado." | D |
| T048 | Tie-down, used sparingly | After a benefit the buyer clearly values | "The third row makes the school run easier, doesn't it?" | "Con la tercera fila se le hace más fácil llevar a los niños, ¿verdad?" | D; sounds scripted if repeated, so scoring penalizes more than two per session |
| T049 | Set up the finance visit | Customer agrees to numbers | "Next you will sit with Ana in finance. She shows you every protection option with its price. You choose what you want, if anything." | "Ahora va a pasar con Ana, de financiamiento. Ella le muestra todas las opciones de protección con su precio. Usted escoge lo que quiera, o nada." | D; menu practice (300% rule) is disclosure |
| T050 | Pass along what you learned | Before finance | (Tell the finance manager the customer's miles and how long they keep cars.) | (Decirle al gerente de financiamiento cuántas millas maneja el cliente y cuánto tiempo se queda con sus carros.) | D |
| T051 | Do not pre-judge products | "Do I need the warranty?" | "That is your call. Ana will show you what it covers and what it costs so you can decide." | "Eso lo decide usted. Ana le muestra qué cubre y cuánto cuesta para que decida." | A: Florida s. 634.121 notice |
| T052 | Law of 250 | Every customer, especially one leaving unsold | "Whatever you decide, thank you for the chance. If anything comes up, call me directly." | "Decida lo que decida, gracias por la oportunidad. Cualquier cosa, llámeme directamente a mí." | D: Joe Girard (verified in book text) |
| T053 | Ask for referrals at delivery | Delivery and follow-ups | "Who do you know that is looking for a car?" | "¿A quién conoce que esté buscando carro?" | D: Girard paid $25 per sold referral; any reward needs attorney approval (store setting) |
| T054 | Monthly contact | Every sold customer | "Happy one year with the Highlander. Does it need anything?" | "Feliz primer año con su Highlander. ¿Le hace falta algo?" | D: Girard |
| T055 | Customer file | After every sale and walkout | (Record family, work, interests and the reason they left; open the next contact with it.) | (Anotar familia, trabajo, intereses y la razón por la que se fue; empezar el próximo contacto con eso.) | D: Girard |

### 8.6 Phone, EV, trainer methods and delivery (T056 to T081)

| Code | Technique | When | English model line | Spanish model line | Grade |
| --- | --- | --- | --- | --- | --- |
| T056 | Value redirect | Price asked before a car is picked | "Fair question, and you will get every number. First, is this one for you or the family?" | "Claro, le doy todos los números. Primero: ¿este es para usted o para la familia?" | D: Joe Verde |
| T057 | Agree first | First words of any objection response | "I agree, it is a lot of money. That is why I want it to be exactly right." | "Estoy de acuerdo, es bastante dinero; por eso quiero que sea exactamente lo que busca." | D: Grant Cardone |
| T058 | Certainty check | After the drive, before numbers | "From one to ten, how sure are you this is the right car? What would make it a ten?" | "Del uno al diez, ¿qué tan seguro está de que este es el carro? ¿Qué le faltaría para llegar a diez?" | D: Belfort's three certainties, honest use only |
| T059 | Yes or no, not maybe | Start of the write-up | "All I ask is that at the end you tell me yes or no. Either is fine. Fair?" | "Lo único que le pido es que al final me diga sí o no; cualquiera de las dos está bien. ¿Le parece?" | B: deferral research, not car-specific |
| T060 | Who else decides, asked early | Greeting or discovery | "Besides you, who else will be part of this decision?" | "Aparte de usted, ¿quién más va a participar en la decisión?" | D: Andy Elliott (neutral use only) |
| T061 | Three options, then silence | First numbers | "Here are three ways to do it. Which fits best?" | "Aquí tiene tres opciones. ¿Cuál le acomoda mejor?" | D: Paul Cummings; see T095 for the research version |
| T062 | Give the number, then a reason to visit | "Just email me the price" | "Sent. That is the full out-the-door number. The one thing I cannot email is your trade value. That takes ten minutes here." | "Enviado; ese es el precio total con todos los cargos. Lo único que no puedo mandarle es el valor de su trade-in; eso toma diez minutos aquí." | D; must satisfy PRICE-02 |
| T063 | Two appointment times with a reason | Any phone or internet lead | "I will have it pulled up and your trade appraised in fifteen minutes. Is 4:15 or 5:45 better?" | "Se lo tengo listo y le evaluamos su trade-in en quince minutos. ¿Le queda mejor a las 4:15 o a las 5:45?" | D |
| T064 | Video and named confirmation | After first contact and the day before | "I just recorded a one-minute video of the exact one you asked about." | "Le acabo de grabar un video de un minuto del carro exacto que preguntó." | D: vendor claims only |
| T065 | Daily-miles reframe | EV range worry | "How many miles is a normal day for you? Let's compare that to what this one covers." | "¿Cuántas millas maneja en un día normal? Vamos a compararlo con lo que este le cubre." | C |
| T066 | Cost-of-ownership sheet | "EVs cost more" | "You are right, the price is higher. Here is gas and service over five years, side by side." | "Tiene razón, el precio es más alto. Aquí está la gasolina y el mantenimiento en cinco años, lado a lado." | B: J.D. Power EVX; only 12% of first-time EV buyers were shown cost of ownership |
| T067 | Yearly review call | Sold customers, once a year | "It has been a year. I would like to check what your car is worth today." | "Ya pasó un año; me gustaría revisar cuánto vale su carro hoy." | D |
| T068 | Advance, not "let me know" | End of every stage | "Rather than leave it open, can we do the appraisal now so you have a real number to take home?" | "En vez de dejarlo en el aire, ¿hacemos la tasación de su carro ahora para que se lleve un número real?" | B: Rackham |
| T069 | Ask permission before answering | Price or trust objections | "Can I share a couple of thoughts on that?" | "¿Me permite compartirle un par de ideas sobre eso?" | B: Gong, business-to-business |
| T070 | Explain how buying works here | Early, first-time buyers | "Here is how it works: drive, appraisal, numbers in writing, then the lender. Nothing is signed until you have seen everything." | "Le explico cómo funciona aquí: la prueba de manejo, la tasación, los números por escrito y luego el banco. Nada se firma hasta que usted lo haya visto todo." | C: HBR case |
| T071 | Service introduction at delivery | Delivery | "Before you go, let me introduce Maria in service. She will handle your first oil change." | "Antes de irse, le presento a María en servicio. Ella le va a atender el primer cambio de aceite." | C: Cox; 74% of service returners likely to repurchase versus 44% |
| T072 | Show the battery report | Used EV, battery worry | "Here is the battery health report for this exact car. This copy is yours." | "Aquí tiene el reporte de la batería de este carro. Esta copia es suya." | B: battery testing data |
| T073 | Straight talk on heat | EV buyers in Miami | "Heat costs batteries a little down here. Charging at home is the best habit." | "Aquí el calor afecta un poco la batería. Lo mejor es cargar en casa." | B: Geotab, 22,700 EVs; average loss 2.3% a year, hot climates about 0.4% faster |
| T074 | The 60-day reassurance | Hesitation on a service contract | "It is optional, it is not required for your loan, and in Florida you can cancel within 60 days." | "Es opcional, no hace falta para el préstamo, y en Florida lo puede cancelar dentro de 60 días." | A: Florida s. 634.121 |
| T075 | Ten-second phone opener | Every sales call | "Hi Maria, this is Luis at Bomnin Chevrolet West Kendall. I am calling about the Equinox you asked about. Do you have two minutes?" | "Buenas, señora María, le habla Luis, de Bomnin Chevrolet West Kendall. La llamo por la Equinox que usted consultó. ¿Tiene dos minutos?" | D: Alan Ram |
| T076 | Two-touch confirmation | Day before and morning of | "Confirming tomorrow at 4. The Silverado you liked is pulled up front." | "Le confirmo para mañana a las 4. La Silverado que le gustó ya está separada al frente." | D: Alan Ram |
| T077 | Switch channels on silence | After one or two unanswered contacts | "Maybe email is not the best way to reach you. Want a 30-second video of the car by text?" | "Quizás el email no es lo más práctico. ¿Le mando por texto un video cortico del carro?" | D; requires text consent (CONSENT-01) |
| T078 | Orphan-owner call | Owners whose salesperson left; buyers from about two years ago | "Your salesperson moved on, so I am your contact now. I can check what you owe against what the car is worth." | "Su vendedor ya no está con nosotros y ahora le atiendo yo. Le reviso cuánto debe contra lo que vale su carro." | D |
| T079 | Standalone trade offer | Customer suspects the trade is being moved around | "We will make you a written offer on your car either way." | "Le hacemos una oferta por escrito por su carro, compre o no compre." | D: Bomnin store policy; confirm per store |
| T080 | What the car means | Discovery, first-car and family buyers | "Besides getting you to work, what does this car mean for you right now?" | "Aparte de llevarlo al trabajo, ¿qué significa este carro para usted en este momento?" | D: Jürgen Klarić (summaries) |
| T081 | Feature follow-up call | Three weeks after delivery (phone version of T039) | "I will call you in three weeks to walk you through anything you have not set up." | "En tres semanas lo llamo para explicarle lo que todavía no haya configurado." | B: J.D. Power 2025 |

### 8.7 Trainer methods, indecision and research-backed negotiation (T082 to T090)

| Code | Technique | When | English model line | Spanish model line | Grade |
| --- | --- | --- | --- | --- | --- |
| T082 | Trade-in first | Right after the greeting, when there is a trade | "Before we look at anything new, let's walk around your Equinox. What do you love about it, and what drives you crazy?" | "Antes de ver algo nuevo, vamos a darle la vuelta a su Equinox. ¿Qué es lo que más le gusta y qué es lo que ya no aguanta?" | D: Mark Tewart |
| T083 | Walk the wheel | Price-fixated customer at the desk | "Let me sketch every way people set this up: cash, finance, lease, shorter, longer. Then you pick what fits." | "Déjeme dibujarle todas las formas de armar este negocio: contado, financiado, lease, más corto o más largo. Usted escoge lo que le conviene." | D: Mark Tewart |
| T084 | "Starting to look" greeting | Lot greeting | "Welcome in. Are you just starting to look and shop around?" | "Bienvenidos. ¿Apenas están empezando a mirar y comparar?" | D: Mark Tewart |
| T085 | Declared transparency | Lot, then again at first numbers | "When we sit down you will see price, trade, payment and every fee on one sheet." | "Cuando nos sentemos, usted va a ver el precio, el trade-in, el pago y cada cargo en una sola hoja." | D: Mark Tewart; only usable if true |
| T086 | Side-by-side for "I've got you beat" | Customer cites a lower quote | "That happens. Let's line both up out-the-door, same equipment, and see what each number buys you." | "Eso pasa. Pongamos las dos ofertas lado a lado, precio final con todo, mismo equipo, y vemos qué le da cada una." | D: Jonathan Dawson |
| T087 | Earn referrals without asking | Long-term book building | "I do not ask for referrals. If I do my job, you will tell people without me asking." | "Yo no le pido referidos. Si hago bien mi trabajo, usted solo le va a contar a la gente." | C: Ali Reda, one documented case (1,582 sales reported in 2017) |
| T088 | Missed-appointment apology | After a no-show, only when true | "I owe you an apology. I got slammed yesterday and never confirmed with you. Can we set a time that works?" | "Le debo una disculpa. Ayer se me complicó el día y no le confirmé la cita. ¿Cuadramos una hora que le funcione?" | D: Jerry Thibeau, secondhand |
| T089 | Us against the problem | Tension at the desk | "This is not you against me. It is us against this payment gap." | "Esto no es usted contra mí. Somos usted y yo contra el problema del pago." | D: Helios Herrera |
| T090 | Story recap, solution last | Before the demonstration | "So the van is eating gas, the third row is broken, and Saturdays are chaos. Here is what changes that." | "O sea, la van se está comiendo la gasolina, la tercera fila no sirve y los sábados son un caos. Mire lo que le cambia eso." | D: Iosu Lázcoz |

### 8.8 Indecision, pricing psychology and negotiation science (T091 to T105)

This family is the strongest new module. "I need to think about it" is usually fear of choosing wrong, and pressure makes it worse; in the same 2.5-million-call study, fear-of-missing-out pressure deepened indecision even when the scarcity was real.

| Code | Technique | When | English model line | Spanish model line | Grade |
| --- | --- | --- | --- | --- | --- |
| T091 | Name the fear | A stall with no clear objection | "A lot of people at this point worry about picking the wrong one and regretting it in a year. Is any of that going on for you?" | "Mucha gente en este punto tiene miedo de escoger el carro equivocado y arrepentirse después. ¿Le está pasando algo de eso?" | B: The JOLT Effect, 2.5 million calls (business-to-business) |
| T092 | Personal recommendation | Torn, or asks what you would do | "If I were in your shoes, with your commute and the kids, I would take the Equinox LT. Here is why." | "Si yo estuviera en su lugar, con ese viaje diario y los niños, yo me llevaría la Equinox LT. Le explico por qué." | B: same; win rate reported to rise from 18% to 44% (secondhand) |
| T093 | Limit the exploration | Wants one more comparison | "You have compared the three that fit your budget. The only open question is the payment. Let's settle that." | "Usted ya comparó los tres que le cuadran en el presupuesto. Lo único que falta es el pago. Resolvamos eso." | B: same; choice overload meta-analysis (Chernev 2015) |
| T094 | Remove real risk | Fear of a lemon or the wrong choice | "Here is the warranty booklet. Let me show you exactly what is covered." | "Aquí está la garantía. Déjeme enseñarle exactamente lo que incluye." | B: same; only real, showable protections |
| T095 | Equivalent packages | First numbers, after discovery | "I put together two ways to do this. Same deal for us, different for you. Which fits you better?" | "Le preparé dos opciones. Para nosotros es lo mismo, pero para usted es distinto. ¿Cuál le conviene más?" | B: Leonardelli and others 2019, six experiments |
| T096 | Trade on its own line when strong | Presenting the trade | "Your trade came in strong at $14,200. Here it is on its own line, and here is your net." | "Su trade-in salió bien, en $14,200. Aquí lo tiene en su propia línea, y aquí está lo que le queda." | B: Kim and others 2022 |
| T097 | Per-day only for small extras | An optional, separately priced product | "It is optional. It is $1,095 total over five years, about 60 cents a day." | "Es opcional. Son $1,095 en total por cinco años, como 60 centavos al día." | B: Gourville 1998 and 2003; reverses for large amounts, so never for the car payment |
| T098 | Honest middle option | Choosing trim or package | "Most families land on the middle one. Here is what you give up going lower and add going higher." | "La mayoría de las familias escoge la del medio. Le enseño lo que pierde si baja y lo que gana si sube." | B: Simonson and Tversky 1992 (decoys excluded; they failed a 91-attempt replication) |
| T099 | "How" question | Customer demands a number you cannot meet | "How am I supposed to get to that number and still give you this truck?" | "¿Y cómo hago yo para llegar a ese número y todavía darle esta troca?" | D: Chris Voss |
| T100 | Say their doubts first | Distrustful or burned buyer | "You are probably expecting me to play games with the numbers and keep you here four hours." | "Seguramente usted piensa que le voy a jugar con los números y tenerlo aquí cuatro horas." | D: Chris Voss |
| T101 | Question where "no" means yes | Asking for a drive or next step | "Would it be a bad idea to take it out for ten minutes right now?" | "¿Sería mala idea darle una vuelta de diez minutos ahorita?" | D: Chris Voss |
| T102 | Reason-first call | Old leads and past customers | "It's Carlos from Bomnin Chevrolet. I am calling because your lease ends in March. Can I take 30 seconds?" | "Le habla Carlos de Bomnin Chevrolet. Le llamo porque su lease se vence en marzo. ¿Me regala 30 segundos?" | B: Gong, 300 million calls; stating the reason raised success 2.1 times (business-to-business) |
| T103 | Match the buyer's style | The current approach stalls | Practical buyer: "Here are the three numbers that matter." | Al práctico: "Estos son los tres números que importan." | B: McFarland, Challagalla and Shervani 2006 |
| T104 | Real common ground | Greeting and walkaround, only when true | "You are from Hialeah? I grew up off 49th Street." | "¿Usted es de Hialeah? Yo me crié por la 49." | B: Gremler and Gwinner 2008, 388 encounters |
| T105 | Steady voice on the price | Saying any number | (Same volume and pace; no rising pitch; no speeding up.) | (Mismo volumen y ritmo; sin subir el tono ni acelerarse.) | B: Van Zant and Berger 2020 |

### 8.9 Concessions, follow-up and delivery (T106 to T117)

| Code | Technique | When | English model line | Spanish model line | Grade |
| --- | --- | --- | --- | --- | --- |
| T106 | Concession staircase | Desk negotiation | "I took this back to my manager and got you two hundred more on the trade. That one was tough to get." (Only when true.) | "Fui donde mi gerente y le conseguí doscientos más por el trade-in. Ese no fue fácil, se lo digo." (Solo si es cierto.) | B: Kwon and Weingart 2004; a 2025 study found big early concessions make the other side push harder |
| T107 | Real deadline on the table | Only when a showable deadline exists | "This bonus cash ends on the 31st. Here is the bulletin." | "Este bono vence el 31. Aquí tiene el boletín." | B: Gino and Moore 2008 |
| T108 | Apology for what you did not cause | Greeting and call-backs | "I am sorry you had to fight the Palmetto traffic to get here." | "Qué pena que le tocó ese tráfico en el Palmetto para llegar hasta acá." | B: Brooks, Dai and Schweitzer 2014; trust rose from 65% to 77% |
| T109 | "What would it have taken?" | After a firm no or lost deal | "Before you go, honestly, what would it have taken for this to be a yes today?" | "Antes de que se vaya, dígame con toda confianza: ¿qué hubiera hecho falta para que hoy me dijera que sí?" | D: Malhotra and Bazerman |
| T110 | Treat a hard demand as a clue | "I need $400 a month, period" | "Help me understand the four hundred. What is that number protecting for you?" | "Ayúdeme a entender esos cuatrocientos. ¿Qué es lo que usted está cuidando con ese número?" | D: Malhotra and Bazerman |
| T111 | Write the condition in | Trade value depends on an unconfirmed payoff | "This number holds if the payoff letter matches the $14,200 you told me. If not, we redo it together, in writing." | "Este valor se mantiene si la carta del payoff confirma los $14,200. Si sale distinto, lo rehacemos juntos, por escrito." | D: Malhotra and Bazerman; state it in the offer's language (LANG-01) |
| T112 | Ask what feels fair | Stalemate over price | "Given what you have seen on other lots, what would feel fair to you?" | "Según lo que usted ha visto en otros dealers, ¿qué le parecería justo?" | D: Stuart Diamond |
| T113 | Feelings before numbers | Angry be-back | "You came in expecting one number and got another. I would be upset too. Let me fix the part that is on us first." | "Usted vino esperando un número y le dieron otro. Yo también estaría molesto. Déjeme arreglar primero lo que nos toca." | D: Stuart Diamond |
| T114 | Trade what is cheap to give | Closing the last gap | "I cannot move the price, but I can have it detailed with a full tank by four if we finish the paperwork now." | "El precio no lo puedo mover, pero se lo tengo lavadito y con el tanque lleno para las cuatro si terminamos los papeles ahora." | D: Stuart Diamond |
| T115 | Set the time, then ask what to think over | "I'll think about it" | "Thursday at six, then. What did you want to think over, so I have answers ready?" | "Perfecto, el jueves a las seis. ¿Qué es lo que quiere pensar, para tenerle las respuestas listas?" | D: Jeremy Miner |
| T116 | Ask for the review later | About ten days after delivery | "Now that you have had the Silverado a week or so, would you share how we did?" | "Ahora que ya lleva una semanita con la Silverado, ¿nos regala un comentario?" | B: Jung and others 2023, about 300,000 consumers; later reminders raised posting 64% |
| T117 | Guard the ending | Delivery | "Both keys, phone paired, tank full, first service booked. Anything missing?" | "Las dos llaves, el teléfono conectado, el tanque lleno y su primer servicio agendado. ¿Le falta algo?" | B: service research; a bad ending hurts more than a staged high point helps |

### 8.10 Compliance-driven lines (T118 to T122)

| Code | Technique | When | English model line | Spanish model line | Grade |
| --- | --- | --- | --- | --- | --- |
| T118 | All-in quote by phone or text | Any price given outside the desk | "The price is $X, and that already includes our $Y dealer fee. Only taxes and the state tag and title fees are added." | "El precio es $X, y ya incluye nuestro cargo de concesionario de $Y. Solo se suman los impuestos y los cargos de placa y título del estado." | A: FTC pricing guidance, September 15, 2026 |
| T119 | Price anyone can pay first | A rebate only some buyers qualify for | "Anyone can drive this home for $X out the door. If you are a first responder, there is another $1,000 off." | "Cualquier persona se lo puede llevar por $X precio total final. Si usted es socorrista, hay $1,000 adicionales de descuento." | A: same |
| T120 | Optional means optional | Customer objects to a pre-installed package | "That package is already on the car, but it is optional. If you do not want to pay for it, here is what we do." (Store policy fills the remedy.) | "Ese paquete ya viene instalado, pero es opcional. Si no lo quiere pagar, esto es lo que hacemos." | A: same; requires store policy |
| T121 | Two-payment menu | Presenting any add-ons | "With the protection products, $A a month. Without them, $B. They are optional. Which would you like?" | "Con los productos de protección, $A al mes. Sin ellos, $B. Son opcionales. ¿Cuál prefiere?" | A: Credit Acceptance consent decree |
| T122 | Graceful "not now" | Customer leaving undecided | "Sounds like today is not the day, and that is fine. Can I text you the out-the-door number so you have it in writing?" | "Parece que hoy no es el día, y está bien. ¿Le envío por texto el precio total final para que lo tenga por escrito?" | C: AI-simulator study 2026; all-in price required |

### 8.11 Overlaps to merge in the content files

Several techniques are variants of each other. Keep each code (old sessions reference them) but link them with a `related` field so the library shows them together: T019 and T106 (concessions); T030, T085 and T118 (out-the-door and all-in); T039 and T081 (feature follow-up); T061 and T095 (options; T095 is the research-backed version); T020 and T107 (real deadlines); T052, T053 and T087 (referrals).

### 8.12 Flawed-model patterns by family

Content editors write one flawed model per technique for demonstrations, following these patterns, so reps see the mistake without being taught a violation.

| Family | Flawed pattern | Example |
| --- | --- | --- |
| Objection sequence | Answers instantly, defends, or argues before asking | "No, the payment is not high, that is a great rate." |
| Discovery | Asks yes/no questions, then pitches features unrelated to answers | "Do you want a nice car? Great, this one has a sunroof." |
| Closing | Asks repeatedly, or never asks | Three closes in two minutes |
| Negotiation | Gives a large concession with no reason and no ask in return | "Fine, I'll take $2,000 off." |
| Indecision | Adds more options or applies pressure | "We have twelve more trims you could look at." |
| Phone | Long opener, dodges the price question, or no appointment ask | "How's it going? Did I catch you at a bad time?" |
| Finance handoff | Pre-judges a product or blends products into a payment | "You'll want the warranty, everyone gets it." (Shown only in compliance lessons, with the violation flagged.) |
| Delivery | Rushes the customer out | "Here are your keys, congrats, see you." |

## 9. Content library: the 65 objections and customer types

Each objection becomes at least one persona and one level 1 scenario by release 2; the 20 marked R1 ship in the pilot. The "behind it" column is the default hidden truth for the persona; scenario files may vary it. Research shows stated reasons for leaving rarely match real ones, so for "talk to my spouse", "need to think" and "no time", the default hidden truth is price, payment, financing or another store. The "behind it" text is experience-based unless a source is named, and the store's CRM lost-deal reasons should reorder priorities (section 19).

### 9.1 Core showroom objections (O01 to O18)

| Code | Customer says | El cliente dice | Usually behind it | Core moves | R1 |
| --- | --- | --- | --- | --- | --- |
| O01 | I need to talk to my wife / husband | "Tengo que hablarlo con mi esposa / esposo" | A real joint decision, or a polite exit hiding a payment worry | T001, T002, T005, T013, T014, T092 | Yes |
| O02 | I am upside down on my loan | "Debo más de lo que vale mi carro" / "Estoy al revés" | Fear the math cannot work; embarrassment. 29.6% of new-vehicle trade-ins were underwater in Q2 2026, by $6,884 on average (Edmunds) | T002, T029, T096, T111, honest options including waiting | Yes |
| O03 | The payment is too high | "El pago está muy alto" | A budget number not yet told | T002, T110, T083, T121 | Yes |
| O04 | The price is too high | "El precio está muy alto" | A comparison you have not seen | T017, T028, T086 | Yes |
| O05 | I need to think about it | "Lo tengo que pensar" | An unvoiced question; fear of choosing wrong | T091, T092, T093, T115 | Yes |
| O06 | I am just looking | "Solo estoy mirando" | Guard up; fear of pressure | T084, T031, T033 | Yes |
| O07 | I am not buying today | "Hoy no voy a comprar" | Wants control of the timeline | T068, T014, T122 | Yes |
| O08 | You are low on my trade | "Me está dando muy poco por mi carro" | An online estimate or attachment; 28% got less than expected (J.D. Power) | T029, T082, T096 | Yes |
| O09 | I want to shop other dealers | "Quiero ver en otros dealers" | Not convinced on price or store | T093, T086, T014 | Yes |
| O10 | Another dealer is cheaper | "En otro dealer me lo dejan más barato" | A quote that may not be like for like | T028, T086 | Yes |
| O11 | Your rate is too high; my credit union is better | "Su tasa está alta; mi cooperativa me da mejor" | Distrust of dealer financing | Welcome outside financing; PRICE-04 | No |
| O12 | My credit is bad | "Tengo mal crédito" | Shame; fear of a public decline | T070, private explanation | No |
| O13 | I have no money down | "No tengo nada de inicial / de down" | Cash is tight, or testing | Show both paths with real numbers | No |
| O14 | Just give me your best price (phone or online) | "Deme su mejor precio" | Comparing without visiting | T118, T062, T063 | Yes |
| O15 | I do not have time for a test drive | "No tengo tiempo para la prueba de manejo" | Not sold on the car, or rushed | Short route; T033 | No |
| O16 | You do not have the color or trim I want | "No tienen el color / la versión que quiero" | Real preference, or an easy exit | T044, locate or order; AVAIL rules | No |
| O17 | I will wait for prices or rates to drop | "Mejor espero a que bajen los precios" | Fear of overpaying | Share what is known; never predict the market | No |
| O18 | I do not trust dealers | "No confío en los dealers" | A bad past experience | T100, T085, T009 | Yes |

### 9.2 2026 market and enforcement objections (O19 to O27)

| Code | Customer says | El cliente dice | Usually behind it | Core moves | R1 |
| --- | --- | --- | --- | --- | --- |
| O19 | Your online price did not include these fees | "El precio en internet no incluía estos cargos" | Feels baited | Apologize, show full breakdown; PRICE-01 | Yes |
| O20 | I did not ask for that add-on | "Yo no pedí eso" | Fear of being packed | Remove it, offer as a priced option; T121 | Yes |
| O21 | That price only works if I finance with you | "Ese precio es solo si financio con ustedes" | Has outside financing | Price that stands with any financing; PRICE-04 | No |
| O22 | The car I saw online is gone | "El carro que vi en internet ya no está" | Bait-and-switch suspicion | Show when it sold; nearest real match | No |
| O23 | Show me how you got my trade number | "Enséñeme cómo sacó el valor de mi trade-in" | Wants fairness more than a higher figure | T029 | No |
| O24 | I want to buy before prices go up | "Quiero comprar antes de que suban los precios" | Real urgency, regret risk later | Confirm facts; keep within budget | No |
| O25 | I need a hybrid and nobody has one | "Necesito un híbrido y nadie tiene" | Fuel cost worry; real scarcity | Real supply data; inbound units | No |
| O26 | I am already talking to another store | "Ya estoy hablando con otro dealer" | First responder set the frame | Ask what they were quoted; compare out-the-door | No |
| O27 | I still cannot work half the features | "Todavía no sé usar la mitad de las cosas" | Overwhelmed at delivery | T039, T081 | No |

### 9.3 Electric vehicle objections (O28 to O32)

In Deloitte's 2026 study, 47% of U.S. respondents named range their top EV concern, 44% charging time and 40% cost.

| Code | Customer says | El cliente dice | Usually behind it | Core moves | R1 |
| --- | --- | --- | --- | --- | --- |
| O28 | I am worried about range | "Me preocupa que no me alcance la carga" | Fear of being stranded | T065 | No |
| O29 | Charging takes too long | "Cargarlo se demora mucho" | Pictures waiting at a public charger | Ask where the car sleeps at night | No |
| O30 | I cannot charge at home | "No tengo dónde cargarlo en casa" | A real barrier (34% of EV rejecters, YouGov 2026) | Be straight; show a hybrid | No |
| O31 | The battery will not last | "¿Y si se daña la batería?" | Fear of a huge repair bill | T072, warranty in writing | No |
| O32 | EVs cost too much | "Los eléctricos son muy caros" | Comparing sticker only | T066, verified figures only | No |

### 9.4 Language and trust (O33 to O40)

| Code | Customer says | El cliente dice | Usually behind it | Core moves | R1 |
| --- | --- | --- | --- | --- | --- |
| O33 | Is that really your best price? You have not moved | "¿Ese es su último precio? No me ha rebajado nada" | A deal with no visible give feels unfair | T042, T106 | Yes |
| O34 | Can I get the contract in Spanish? | "¿Me puede dar el contrato en español?" | Fear of hidden terms | T041; store policy set with counsel | No |
| O35 | I only have an ITIN | "Solo tengo ITIN, no tengo Social" | Fear of rejection | Explain options privately; never claim only one lender approves | No |
| O36 | I just got here, I have no credit yet | "Acabo de llegar, todavía no tengo crédito" | Thin file | Real paths, such as a co-signer | No |
| O37 | The Spanish ad said something different | "En el anuncio en español decía otra cosa" | Limits not stated in Spanish | Explain every condition in Spanish; LANG-01 | No |
| O38 | My son will translate for me | "Mi hijo me traduce" | Language barrier hiding confusion | Offer a bilingual staff member | No |
| O39 | (Addressed in Spanish without being asked) | (Spoken in English) | Feels stereotyped | T040 | No |
| O40 | In my country the dealer always gives a discount | "En mi país siempre le rebajan a uno" | Expects haggling; unfamiliar with U.S. fees | T045, T042 | No |

### 9.5 Phone, internet, finance and EV value (O41 to O50)

| Code | Customer says | El cliente dice | Usually behind it | Core moves | R1 |
| --- | --- | --- | --- | --- | --- |
| O41 | Just email me the out-the-door price | "Mándeme el precio final por email" | Fear of bait and switch | T062, T118 | Yes |
| O42 | Another dealer already gave me a number | "Ya otro dealer me dio un número" | A quote missing fees or the trade | T086 | No |
| O43 | I will wait, EV prices keep dropping | "Mejor espero; los eléctricos siguen bajando" | Fear of losing value | Be straight; show lease or used EV | No |
| O44 | There is no tax credit anymore | "Ya no hay crédito federal" | True; wants to know what replaces it | Confirm; current incentives in writing | No |
| O45 | What will it be worth when I trade it? | "¿Cuánto va a valer cuando lo cambie?" | Resale fear; EVs lose 57.2% over five years versus 41.8% for all vehicles (iSeeCars 2026) | Honest data; hybrid or lease | No |
| O46 | I do not want any extras in finance | "No quiero ningún extra en financiamiento" | A past bad experience | "Nothing is added without your yes"; T121 | Yes |
| O47 | I have three days to cancel, right? | "Tengo tres días para cancelar, ¿verdad?" | Belief in a cooling-off right that does not apply | Correct honestly; slow down; CANCEL-01 | No |
| O48 | Will the battery die in this heat? | "¿La batería se daña con este calor?" | Climate worry | T073, warranty | No |
| O49 | Another dealer said GAP was required | "En otro dealer me dijeron que el GAP era obligatorio" | Past misinformation | "GAP is optional"; T121 | No |
| O50 | Is that free oil change really free? | "¿Ese cambio de aceite gratis de verdad es gratis?" | Distrust after hidden charges | Show it on the invoice | No |

### 9.6 Miami, indecision and negotiation types (O51 to O65)

| Code | Customer says | El cliente dice | Usually behind it | Core moves | R1 |
| --- | --- | --- | --- | --- | --- |
| O51 | (Spanish variant of O02) | "Estoy al revés con mi carro" | Fear the shortfall is hidden in the new loan | Payoff and value side by side | No |
| O52 | My cousin can co-sign | "Mi primo me sirve de co-firmante" | Thin credit, fear of rejection | Explain the process; never promise approval | No |
| O53 | You use technical words to confuse people | "Hablan con palabras técnicas para confundirlo a uno" | A past bad experience | Plain words; every number in writing | No |
| O54 | Are you going to slip in a warranty? | "¿Me van a meter una garantía sin decirme?" | Awareness of packing | T121 | No |
| O55 | I have got you beat down the road | (see O10) | Quote missing fees, or a test | T086 | No |
| O56 | (The no-show who goes quiet) | (no reply) | Embarrassment, or another store | T088, T077 | No |
| O57 | The AI told me this is the fair price | "La inteligencia artificial me dijo que ese es el precio justo" | A machine figure that may be wrong | See it, compare line by line | No |
| O58 | What would you do if you were me? | "¿Usted qué haría si fuera yo?" | Wants someone to own the advice | T092 | Yes |
| O59 | Send me one more comparison | "Mándeme otra comparación" | Stuck exploring | T093 | No |
| O60 | I do not want to regret it | "No quiero arrepentirme" | Doing nothing feels safer | T091, T094 | Yes |
| O61 | Maybe I will wait for the new model | "A lo mejor espero al modelo nuevo" | Waiting feels safe | Facts on what waiting costs | No |
| O62 | (Goes silent after two options) | (silencio) | Choice difficulty, not price | T092 | No |
| O63 | I have all the time in the world | "Yo no tengo ningún apuro" | Often a bluff | Ask about their current car's situation | No |
| O64 | If you dropped it that fast, it is still too high | "Si lo bajó tan rápido, es porque todavía está caro" | A fast, unexplained concession | T106 | No |
| O65 | I did not ask for that package, and you say it is already on the car | "Yo no pedí ese paquete y me dice que ya viene en el carro" | Feels forced into extras | T120 | Yes |

R1 count: 20 (O01 to O10, O14, O18, O19, O20, O33, O41, O46, O58, O60, O65). The finance-handoff, two-payment menu and all-in phone quote scenarios round out the pilot set.

## 10. AI customer engine

The AI customer is a language model playing a defined persona inside a scenario state machine that the app controls. The model writes the words; the engine decides the facts, when the hidden concern can surface, and when the customer leaves. This split exists because a June 2026 study of 2,790 real sales conversations found that AI-simulated customers who should not buy rarely say "not now" and leave; they cut expressed resistance from 25.1% to 13.5% and nearly doubled deliberation ("Simulated Customers Never Walk Away", preprint). Left to the model, practice would be too easy and scores would be inflated.

### 10.1 Persona fields

| Field | Meaning | Example (partner check) |
| --- | --- | --- |
| Situation | Vehicle interest, budget, trade, credit, timeline, household | Married, mid-40s, midsize SUV, paid-off sedan to trade, good credit |
| Stated objection | What they say out loud (an objection code) | O01: "I need to talk to my wife" |
| Hidden truth | The real concern, revealed only when unlocked | Payment is $60 a month above what he told her |
| Unlock conditions | Rep behaviors that make the customer reveal it | Rep asks what the wife will ask about, or asks directly about the payment |
| Temperament | Friendly, guarded, rushed, analytical, irritated, theatrical, skeptical, aggressive, anxious | Friendly, a little evasive |
| Buyer orientation | Task, relationship or self (for T103 scoring) | Relationship |
| Walk-out triggers | Rep behaviors that raise the exit probability | "Can't you decide yourself?", a made-up today-only price, a third push after two refusals |
| Win condition | What counts as success; not always a sale today | Hidden gap surfaced plus a firm appointment or a live call with the wife |
| Language mix | English, Spanish, or mixes when the rep mixes | Spanish, mixes "el down" and "el trade-in" |
| Register | Usted unless the rep and customer move to tú | Usted |
| Voice | Speech synthesis voice id per language | Miami Caribbean Spanish male, 40s |
| Difficulty | 1 reveals after one good question; 3 needs several and punishes mistakes | 1 |

### 10.2 Starter persona roster

| Persona | Stated objection | Hidden truth | Temperament | Level |
| --- | --- | --- | --- | --- |
| Partner check | Needs to talk to spouse | Payment is $60 over what he told her | Friendly, evasive | 1 |
| Browser | Just looking | Lease ends in five weeks | Guarded | 1 |
| Thinker | Needs to think | Unsure the third row fits two car seats | Analytical | 1 |
| Underwater owner | Upside down | Owes about $7,000 more than the trade is worth; embarrassed | Anxious | 2 |
| Payment buyer | Payment too high | Hard ceiling of $550 not yet stated | Rushed | 2 |
| Trade defender | Low on my trade | Saw a higher online estimate for a cleaner car | Irritated | 2 |
| Cross-shopper | Another dealer is cheaper | The other quote leaves out fees | Analytical | 3 |
| Burned buyer | Does not trust dealers | Was surprised by add-ons at signing last time | Irritated | 3 |
| Grinder | Wants $3,000 off or walks | Will buy at $1,200 off if the rep holds and trades each concession | Aggressive | 3 |
| Walker | Stands and heads for the door | A bluff; stays if the rep stays calm and asks one good question | Theatrical | 3 |
| Deadline tester | "Is that rebate really ending?" | Will buy today if the deadline is real and shown | Skeptical | 2 |
| Regret avoider | "I don't want to regret it" | Fear of picking the wrong trim | Anxious | 2 |
| Spanish-first family buyer | "Tengo que consultarlo con la familia" | Family must see it; worried the rate is unfair | Warm, cautious | 2 |
| ITIN buyer | "Solo tengo ITIN" | Fears rejection in front of family | Quiet | 2 |
| Package objector | "I did not ask for that package" | Will buy if the package comes off or the store's remedy is offered | Irritated | 2 |

All remaining objections in section 9 get personas built the same way by release 2.

### 10.3 Scenario state machine

Each session runs a state machine in the voice gateway. States: `greeting`, `discovery`, `presentation`, `objection`, `negotiation`, `closing`, `finance_handoff` (finance scenarios), `ending`. Events move between states. The engine passes the current state and instructions to the model on every turn.

1. **Unlock tracking.** After each rep turn, a fast classifier checks whether any unlock condition was met (for example, "asked a clarifying question about the payment"). When met, the engine sets `hidden_unlocked = true` and instructs the model that the customer may now reveal the hidden truth naturally, in one or two turns, not instantly. Difficulty 3 requires two separate unlocks.
2. **Trigger tracking.** Each walk-out trigger hit by the rep is logged and raises the exit probability by the scenario's `triggers_raise_by` value.
3. **Exit policy.** At the end of the objection and closing states, the engine draws against the exit probability. Base rates are set per scenario (for example, walk-away 10%, not-now 25%) and later calibrated to the store's CRM walk-away and be-back data. On an exit, the engine instructs the model to end the conversation in character ("Not today. Thanks." / "Hoy no, gracias.") and stop engaging, so the rep must secure a next step in the remaining one or two turns (T122, T014).
4. **Win detection.** When the win condition is met (for example, a firm appointment with day and time), the engine moves to `ending` with `end_reason = next_step` or `sale`.
5. **Turn and time limits.** Each scenario has a `max_turns` (default 24) and a soft time limit (default 8 minutes). At the limit, the customer politely ends the conversation.
6. **Random variation.** Each run varies the persona's surface details (names, exact amounts within ranges, which unlock phrasing works, mood) from a seed so reps cannot memorize a scenario. The seed is stored with the session for reproducibility.
7. **Anchoring response.** If the rep opens with a number and no reason, the engine raises walk-away probability slightly and the customer reacts with mild offense, reflecting the 2025 meta-analysis finding that ambitious openings cause more impasses and worse feelings.

### 10.4 Customer prompt architecture

The customer prompt is assembled from versioned parts, never written inline:

1. **Role frame:** "You are playing a car buyer in a sales training roleplay. Stay in character. Never coach the salesperson. Never break character unless the session is ended by the system."
2. **Persona block:** all persona fields except those the engine controls.
3. **Facts block:** the scenario facts the customer knows (their budget, their trade, what the other dealer quoted). The customer never invents vehicle facts, prices or dealership policies; if asked, they say they do not know.
4. **State block:** current state, whether the hidden truth is unlocked, whether an exit has been triggered, turns remaining.
5. **Behavior rules:** speak like a real customer (short turns, interruptions allowed, hesitations), resist in proportion to difficulty, never volunteer the hidden truth before unlock, express real resistance and real walk-away intent when instructed, respond in the language the rep uses unless the persona prefers otherwise, mirror the rep's register.
6. **Language block:** Miami Spanish guidance and glossary terms (section 16) when the session is in Spanish.

Output is streamed as plain speech text. Every sentence passes the compliance check before synthesis (section 4.3, step 7).

### 10.5 Worked example: "I need to talk to my wife" (O01, level 1)

This is the template every scenario copies: what is behind the objection, the move sequence, a model conversation in both languages, the persona, and the scoring.

**What is behind it.** The same sentence has three meanings: a real joint decision (they will not commit a household payment alone, and should not); a polite exit hiding a payment, price or car concern; or a need for reassurance.

**Move sequence.** Pause (T001); acknowledge it is a joint decision and never suggest deciding alone (T003); clarify what the partner will want to know (T002); isolate whether the car and numbers are right apart from the conversation at home (T005); respond to the hidden concern or bring the partner in (T013); set a firm next step with a day and time and something to take home (T014).

**Model conversation, English.**

- Customer: I like it, but I need to talk to my wife before I do anything.
- Rep: (pause) Of course. It is a big purchase and you should both be comfortable. When you talk tonight, what do you think her first question will be?
- Customer: Probably the payment.
- Rep: That makes sense. Setting the conversation with her aside for a second, is this the right car for you?
- Customer: Yeah, I love the car.
- Rep: And the payment. Is it where you told her it would be?
- Customer: Honestly, it is about sixty bucks higher than what I said.
- Rep: I appreciate you telling me. Let me show you two ways to close that gap, and then you will have real options to bring her. Would she be free for a quick video call so she can see the car, or is it better if you both come in tomorrow?
- Customer: She is off at five tomorrow.
- Rep: Tomorrow at 5:30, then. I will have the car pulled up and both payment options printed for you to take home tonight.

**Model conversation, Spanish.**

- Cliente: Me gusta, pero tengo que hablarlo con mi esposa antes de hacer nada.
- Vendedor: (pausa) Claro que sí. Es una decisión importante y los dos deben sentirse cómodos. Cuando lo hablen esta noche, ¿qué cree que ella le va a preguntar primero?
- Cliente: Seguro que por el pago.
- Vendedor: Tiene sentido. Dejando esa conversación a un lado un momento, ¿este es el carro para usted?
- Cliente: Sí, el carro me encanta.
- Vendedor: ¿Y el pago está donde usted le dijo a ella que iba a estar?
- Cliente: La verdad, está como sesenta dólares por encima.
- Vendedor: Le agradezco que me lo diga. Déjeme enseñarle dos maneras de cerrar esa diferencia, y así le lleva opciones reales. ¿Ella podría atender una videollamada ahora para ver el carro, o prefieren venir los dos mañana?
- Cliente: Ella sale a las cinco mañana.
- Vendedor: Mañana a las cinco y media, entonces. Le tengo el carro listo y las dos opciones de pago impresas para que se las lleve esta noche.

**Scoring for this scenario.**

| Behavior | Points |
| --- | --- |
| Paused at least two seconds before replying | 10 |
| Acknowledged the joint decision without pushback | 15 |
| Asked a clarifying question before offering any solution | 20 |
| Isolated the objection | 20 |
| Surfaced the hidden payment gap | 15 |
| Offered to include the partner | 10 |
| Set a specific day and time | 10 |
| Automatic fail: belittled consulting a partner, made up a deadline, or misstated a number | 0 for the attempt |

## 11. Voice pipeline

Voice is the product; salespeople will not type, so a session must feel like a real conversation in both languages, with turn latency near one second. Speech recognition of mixed Miami Spanish and English is the single largest technical risk, so the build starts with a provider bake-off on local recordings before any provider is committed.

### 11.1 Speech recognition requirements

1. Streaming recognition with interim and final results.
2. English, Spanish and code-switched speech in the same session, without the rep choosing a mode. The best published 2024 result on the Miami Bangor code-switching benchmark still had a 48% word error rate, so no provider will be perfect.
3. Custom vocabulary from the glossary: "el down", "la inicial", "el trade-in", "dealer fee", "cargo de concesionario", "co-firmante", "co-signer", "codeudor", "al revés", "payoff", "GAP", "APR", "score", vehicle model names (Equinox, Silverado, Tahoe, Trax, Malibu, Blazer EV), and Miami place names (Palmetto, Hialeah, Kendall, Doral, Westland).
4. Numbers must be recognized reliably in both languages, including "quince" versus "cincuenta" and dollar amounts read either way, because the compliance engine compares spoken numbers to scenario facts. When a number's confidence is below a threshold, the gateway marks it uncertain and the rule engine does not issue a critical violation on that number alone; it flags it for review instead.
5. Word timestamps, so the gateway can measure pause length before answering, speaking rate in words per minute, and monologue length.
6. U.S. data residency and a contract that bars training on customer audio.

### 11.2 Speech recognition bake-off (milestone 1)

1. With consent, record 30 to 60 minutes of real Miami floor and BDC speech from the pilot store: Cuban, Venezuelan, Colombian, Puerto Rican and other speakers, English, Spanish and mixed.
2. Hand-transcribe it with a native Miami speaker as the reference.
3. Run at least three candidate providers. Measure word error rate overall, error rate at language switch points, number accuracy, latency to final result, and cost per hour.
4. Pick the provider with the best number accuracy and switch-point accuracy within the latency budget. Number accuracy outweighs overall word error rate, because numbers drive compliance.
5. Repeat the bake-off every six months; providers improve quickly.

### 11.3 Turn-taking

- End of turn: voice activity silence of about 700 milliseconds combined with the provider's end-of-utterance signal. Tune per language; Spanish speakers in the pilot may pause differently.
- Barge-in: if the rep starts speaking while the customer audio is playing, stop playback within 200 milliseconds and treat the rep's speech as a new turn. Real customers get interrupted; the scoring engine can count interruptions.
- The customer may interrupt the rep only when the persona's temperament is rushed, irritated or theatrical, and only after the rep has spoken for more than 40 seconds without a question. This trains reps out of monologues.
- Pause measurement: the time from the end of the customer's objection to the start of the rep's reply is stored per turn. T001 scoring uses it.

### 11.4 Speech synthesis

1. Streaming synthesis with first audio under 300 milliseconds after the first sentence is ready.
2. Natural U.S. English voices and Latin American Spanish voices suited to Miami (Caribbean and Venezuelan or Colombian accents preferred over Castilian). Each persona has a voice per language. A native Miami listener approves each voice before it ships.
3. Prosody: synthesize hesitations and fillers the model writes ("um", "este", "o sea") naturally; never read stage directions aloud. The model marks non-spoken cues in brackets, and the gateway strips them.
4. Numbers and money: normalize before synthesis so "$38,450" is read as "thirty-eight thousand four hundred fifty dollars" or "treinta y ocho mil cuatrocientos cincuenta dólares".

### 11.5 Audio capture and fallbacks

- Browser capture with echo cancellation and noise suppression on, because reps practice on a loud showroom floor. Show a live input meter and a "too noisy" warning when the signal-to-noise ratio is low.
- Headset recommended for BDC agents; the phone's built-in microphone must still work for floor reps.
- If the WebSocket drops, reconnect within 5 seconds and resume the session from the last completed turn. If reconnection fails, save the partial session and let the rep resume or restart.
- Text fallback: if the microphone is unavailable, the rep can type, but the session is marked `text_mode` and voice-only rubric items (pause, pace, volume) are excluded from the score rather than scored as zero.

### 11.6 Voice metrics captured for scoring

| Metric | How measured | Used by |
| --- | --- | --- |
| Pause before reply | Gap between customer's last word and rep's first word | T001 |
| Speaking rate | Words per minute per turn, compared with the rep's own baseline from the first minute | T001, T105 |
| Rate change after an objection | Turn rate after an objection minus baseline (Gong found average reps sped up to about 188 words a minute, top reps held about 176) | T001 |
| Volume and pitch on the price sentence | Mean and variation of loudness and pitch versus baseline | T105 |
| Talk share | Rep speaking time divided by total speaking time | Scoring (section 13) |
| Longest monologue | Longest uninterrupted rep stretch | Scoring |
| Questions asked | Count of rep turns ending in a question | Discovery scoring |
| Interruptions | Rep speech starting while the customer is speaking | Coaching note |

## 12. Session flow

Every practice session follows the same four steps: demonstration, roleplay, debrief and behavior card. A full session takes 8 to 15 minutes; a refresher session takes 5 to 10.

### 12.1 Step 1: demonstration (optional after first attempt)

1. The rep picks or is assigned a scenario. The screen shows the objection, the target techniques, and their evidence grades.
2. The app plays two short audio demonstrations, each 45 to 90 seconds: a flawed model first, then a good model, both voiced by the AI playing rep and customer. Showing both is required by the behavior-modeling research (section 8.1).
3. After each, one sentence names what to notice ("Notice the pause before the reply" / "Fíjese en la pausa antes de responder").
4. Demonstrations are pre-generated from content and cached, not generated live, so they are consistent and compliance-checked in CI.
5. The rep can skip the demonstration after their first attempt at that scenario.

### 12.2 Step 2: roleplay

1. **Pre-brief (one screen).** The customer's name, what they came in for, and the setting ("Saturday afternoon, showroom floor" or "Inbound phone call"). The hidden truth is never shown. The rep chooses English or Spanish, or "follow the customer" (the persona starts in its preferred language).
2. **Live conversation.** Push-to-talk is not used; the conversation is hands-free with automatic turn detection. The screen shows a minimal view: the customer's name and avatar, a live waveform, a timer, and a small "end session" button. No live transcript by default, because reading interrupts listening; a store setting can turn it on for accessibility.
3. **Numbers sheet.** In negotiation and finance scenarios, the rep has an on-screen worksheet built from scenario facts (price, fees, all-in price, trade, payment options with and without add-ons). The rep can show it to the customer by tapping "show sheet", which the AI customer then "sees". This trains T009, T030 and T121 without the rep inventing numbers.
4. **Ending.** The session ends when the engine reaches a win, an exit, the turn limit or the time limit, or when the rep taps end. Ending early by the rep is recorded as `abandoned` and still scored on what happened.
5. **Live flags.** Critical compliance violations are not shown mid-session (to keep realism) unless the store sets "stop on critical violation", which the pilot uses for the first two weeks of onboarding.

### 12.3 Step 3: debrief

The debrief arrives within 30 seconds of the session ending (90 seconds worst case). It has four parts, in the rep's language, and stays short enough to read on a phone screen in under a minute.

1. **Score and result.** The total, pass or not, and how the customer left (bought, booked, walked, not now).
2. **What worked.** One or two specific behaviors with the exact moment quoted.
3. **The one change that matters most.** A single behavior, explained with its why, not a list of everything wrong. Research on coaching and feedback favors one specific, actionable change; the AI explains why it matters, and leaves the step-by-step how to the manager's floor check.
4. **The turning point.** A replay of the 10 to 20 seconds where the conversation turned, with the rep's line and a model alternative.

If there was a critical compliance violation, it is shown first, above the score, with the true fact it conflicted with and the compliant line from the library.

### 12.4 Step 4: behavior card

1. At most one behavior card is issued per rep per week, chosen from the rep's lowest-scoring rubric item across the week's sessions, weighted toward items with the strongest evidence grade.
2. The card shows the behavior, a one-line model in the rep's language, and when it will be checked.
3. The same card is issued to the rep's manager with a scripted 60-second floor check (section 14).
4. The card stays open until the manager records the check or the week ends.

### 12.5 Session modes

| Mode | Purpose | Scoring | Visible to manager |
| --- | --- | --- | --- |
| Practice | Daily reps | Full score and debrief | After the private window |
| Demonstration only | Learn a technique | None | Completion only |
| Certification | Prove a level | Full score, fixed seed set, stop on critical violation | Immediately |
| Warm-up | 3-minute quick drill on one technique, for the start of a shift | Single rubric item | Completion only |
| Customer prep | Rep describes a real upcoming customer and practices against a persona built from that description | Coaching notes only | No (private) |

## 13. Scoring engine and rubric

Every session is scored on the same five dimensions so a manager can compare reps and track one rep over time, with scenario-specific items added on top. Honesty is pass or fail: a critical compliance violation fails the attempt regardless of every other score. Weights below are a first draft to be calibrated against the store's outcomes (section 19).

### 13.1 Dimensions

| Dimension | What it measures | Weight |
| --- | --- | --- |
| Composure | Pause before replies, steady pace and volume after objections and on the price | 15% |
| Discovery | Questions before solutions, hidden concern found, needs summarized | 30% |
| Technique | The scenario's target techniques, in order | 25% |
| Honesty | No critical violation in section 4.4 | Pass or fail |
| Outcome | The persona's win condition reached, or a consented next step secured before an exit | 30% |

### 13.2 Universal rubric items

These apply in every relevant scenario. Each item has an id, a check method, points, and its evidence.

| Id | Behavior checked | Method | Evidence |
| --- | --- | --- | --- |
| U-PAUSE | Pause of at least two seconds before answering an objection | Turn timing | Gong: top reps pause longer after objections |
| U-PACE | Speaking rate after an objection no more than 8% above the rep's baseline | Turn timing | Gong: average reps sped up to about 188 words a minute, top reps held about 176 |
| U-QFIRST | A clarifying question asked before any solution after an objection | LLM judge with quoted span | Gong: 54.3% versus 31.0% |
| U-ISOLATE | Isolated the real concern | LLM judge | Stated-versus-real reason data |
| U-HIDDEN | Hidden concern surfaced (engine event) | Engine state | Scenario design |
| U-SUMMARY | Needs summarized and confirmed before numbers | LLM judge | T007 |
| U-TALK | Rep talk share at or below 65% | Timing | Gong: results suffered above 65%; steadiness mattered more than question count |
| U-MONO | Longest monologue under 60 seconds | Timing | Gong: shorter seller monologues in won deals |
| U-ADAPT | Changed approach after the customer signaled their style | LLM judge | Verbeke 2011 (adaptiveness, β = .27); Franke and Park 2006 |
| U-KNOW | Product answers accurate and specific | Compare to spec sheet facts | Verbeke 2011 (knowledge, β = .28) |
| U-LANG | Followed the customer's language from the first turn; mixed only after the customer mixed | Language detection per turn | Service-encounter research; Alvarez 2020 |
| U-ONECLOSE | Asked for the decision once at the right moment; no more than two closes in a session | Count of closing questions | Rackham |
| U-TIEDOWN | No more than two tie-downs in a session | Count | T048 |
| U-RECOMMEND | When the customer was torn, gave one specific recommendation with a reason | LLM judge | The JOLT Effect |
| U-LIMIT | No more than three vehicles in play | Count from transcript | Choice overload meta-analysis |
| U-NEXT | Before any exit, secured a specific, consented next step (day and time, or permission to text the all-in price) | Engine state plus judge | T014, T122 |
| U-FIRSTNUM | First number stated with a reason | LLM judge | 2025 first-offer meta-analysis |
| U-CONCESS | Concessions in at least two shrinking steps, each with a reason and an ask in return | Number sequence plus judge | Kwon and Weingart 2004 |
| U-DEADLINE | Every deadline backed by a showable source in the scenario | Rule DEAD-01 | Gino and Moore 2008 |
| U-TOTALFIRST | Total stated before itemizing | Rule PRICE-05 | Partitioned pricing meta-analysis |

### 13.3 Channel-specific items

| Rubric | Extra items |
| --- | --- |
| Phone (R-phone) | Name, store and reason within 10 seconds (T075, T102); all-in price if asked (PRICE-02); two appointment times with a reason (T063); appointment confirmed with the vehicle named (T076); no "Did I catch you at a bad time?" opener (Gong: it cut booking odds 40%) |
| Finance (R-finance) | Two-payment menu shown (PAY-02); no product called required (ADD-01); service contract described as optional and cancellable within 60 days (ADD-04); finance visit set up (T049) |
| Delivery (R-delivery) | Close-out checklist with "anything missing?" (T117); service introduction (T071); follow-up scheduled (T039); referral or review request timed correctly (T053, T116) |

### 13.4 How scoring runs

1. **Deterministic pass** (worker, under 2 seconds): timing items, counts, rule-engine results, engine events.
2. **Judge pass** (worker, under 60 seconds): the strongest available Claude model receives the transcript, scenario facts, rubric items needing judgment, and a fixed judge prompt. It returns structured JSON: for each item, points, a quoted transcript span as evidence, and a one-sentence explanation in both languages. Temperature 0.
3. **Meaning over words.** The judge is instructed to score intent, because speech recognition will garble some words in mixed-language speech. Items are never failed for wording alone.
4. **Low-confidence handling.** If the transcript confidence on a turn central to an item is low, that item is marked "not scored" rather than failed, and the debrief says so.
5. **Assembly.** Dimension scores are combined with the weights, the honesty gate applied, and the score stored immutably with the judge model and prompt version.
6. **Calibration.** Each quarter, two trained human raters score a random 5% sample. Agreement between the judge and humans must stay at or above the agreement between the two humans; if not, the judge prompt is revised and the version bumped. Track per-item agreement, not just totals.

### 13.5 Pass thresholds

| Level | Pass | Notes |
| --- | --- | --- |
| Level 1 (certification) | 70 or more and honesty pass | Required on all 20 release 1 objections before taking customers alone |
| Level 2 | 75 or more and honesty pass | Quarterly recertification |
| Level 3 | 80 or more and honesty pass | Advanced, optional |

Scores shown to reps are always paired with the one change that matters most. A score alone is never the message.

## 14. Manager loop, floor checks and dashboard

The manager loop is what turns practice into sales, so it is built as a first-class workflow with its own scripts and scores. Four findings drive it: roleplay alone showed no average sales effect (Habel and others); managers' coaching skill predicted results while frequent coaching from weak coaches lowered them (Dahling and others 2016, 1,246 reps); step-by-step coaching worked from a manager but not from an AI (Casenave and others 2025); and reps' self-ratings barely matched supervisors' (Blume and others 2010, 89 studies).

### 14.1 The weekly loop

1. **Monday:** each rep receives one behavior card (section 12.4). The manager receives a list of this week's cards for their team, grouped by behavior so they can watch for several reps at once.
2. **During the week:** the manager watches for the behavior on the floor or on a recorded call, then opens the card and records the check.
3. **The floor check** takes 60 seconds and follows the card's script: say what you saw, name the one behavior, show exactly how (the manager models the line in person), and agree when to try it next.
4. **Recording the check:** observed (yes, partly, no), an optional one-line note, and two quick self-checks for the manager ("I gave one specific behavior", "I modeled it"). This takes under 60 seconds on a phone.
5. **Friday:** unchecked cards are marked missed. The general manager sees completion by manager.

### 14.2 Floor-check script (example, T002 clarify with a question)

**English:** "I watched your talk with the couple at the Tahoe. When they said the payment was high, you went straight to options. Next time, ask first: 'What number did you have in mind?' Let's try it on your next up. I'll check back after lunch."

**Spanish:** "Vi su conversación con la pareja de la Tahoe. Cuando dijeron que el pago estaba alto, usted fue directo a las opciones. La próxima vez, pregunte primero: '¿Qué número tenía en mente?' Probémoslo con su próximo cliente. Le pregunto después del almuerzo."

Every behavior card in the content library carries a script in this four-part shape: what I saw, the one behavior, the exact line, when we check again.

### 14.3 Manager coaching quality

Because weak coaching can hurt, the app scores the manager too, privately to the manager and visibly to the general manager:

| Measure | Target |
| --- | --- |
| Floor-check completion | 80% or more of cards checked |
| Time from card issue to check | Under 3 working days |
| Specific behavior named | 90% or more of checks |
| Line modeled in person | 70% or more of checks |
| Manager practice | Managers complete a monthly "coach the coach" roleplay where the AI plays a rep and the manager delivers a floor check; scored on the four-part shape |

### 14.4 Where to aim coaching

The dashboard defaults to middle performers, because coaching moved them most (up to 19% in one vendor study) and barely moved the weakest and strongest. It also flags low performers and high goal-setters for extra assigned practice, since those groups gained 7% to 35% from AI roleplay in the Habel study.

### 14.5 Manager dashboard

1. **Team view:** each rep with practice sessions this week, average score trend over 8 weeks, certification status, open behavior card, last compliance flag. Sort by "needs coaching".
2. **Rep view:** score history by dimension, weakest rubric items, recent sessions with playback (respecting the private window), debriefs, behavior card history with check results.
3. **Compliance view:** critical violations by rule and by rep, with the turn and the true fact, so the manager can address patterns (for example, a rep who keeps quoting payments without the add-on split).
4. **Assignments:** assign a module or scenario to one rep or many, with a due date and a reason that the rep sees.
5. **Outcome view (release 2):** practice and score trends next to CRM outcomes for the same reps (close rate, appointment show rate, add-on cancellations), clearly labeled as correlation, not proof.
6. **Exports:** CSV of sessions and scores for the store's own records.

### 14.6 What the manager never sees by default

A rep's sessions inside their private window; customer-prep sessions; and any rep's raw score without its debrief context. These protect the willingness to practice, which the whole product depends on.

## 15. Training cadence, onboarding and certification

Practice is short and frequent, never a one-time course, because skills decay within days without use and spaced practice beats massed practice. No study sets one best session length for sales; the numbers below are the recommended defaults and must be A/B tested at the pilot.

### 15.1 Evidence behind the cadence

- Skill decay: substantial loss within one to seven days without practice; cognitive skills decay faster; less loss when practice conditions match real ones (Arthur and others, 1998, 178 effect sizes).
- Spacing: in 26,258 physicians, double-spaced repetition beat single (learning 62.2% versus 51.8%); a 2026 review of 15 simulation studies found spaced training as effective as massed, with some retention advantage, mostly at intervals of about a week.
- Retention after a single event: one often-cited curve shows retention near 33% a day after a single session and about 21% after a month (directional; training-vendor sourced).
- Practice volume: vendor data says top teams averaged 7 sessions per rep and practiced every 3 days (grade D, consistent with the above).
- Turnover: non-luxury sales consultant turnover was 73% in 2024 with a median tenure of 1.9 years, so ramp speed matters most.

### 15.2 Default schedule

| Phase | Duration | Cadence | Content |
| --- | --- | --- | --- |
| Week 1 | 5 days | 20 minutes a day | Road to the sale, core sequence (T001 to T014), greeting and phone opener, all-in quote, the first 5 objections; stop on critical violation is on |
| Weeks 2 to 4 | 15 days | 15 to 20 minutes a day, 1 or 2 roleplays | Remaining release 1 objections, negotiation, finance handoff, indecision |
| Certification | Day 30 | One sitting | Pass all 20 release 1 objections at level 1 before taking customers alone |
| Ongoing | Indefinite | 5 to 10 minutes, 3 times a week | The app serves each rep's weakest rubric items and objections, spaced so no item goes more than 10 days without practice |
| Quarterly | 30 minutes | Once a quarter | Recertification at level 2 on a random set, visible to the manager |
| Warm-up | 3 minutes | Start of shift, optional | One technique drill |

### 15.3 Scheduling algorithm

1. Each rubric item and objection has a mastery estimate per rep, from 0 to 1, updated after each session (recent sessions weighted more).
2. Items below 0.7 are due for practice; the interval before an item is due again grows as mastery rises (about 2 days at low mastery, up to 10 days at high mastery), and shrinks after a failure.
3. The daily recommendation picks one scenario that covers the most due items, preferring scenarios the rep has not seen in the last week, and respects manager assignments first.
4. Compliance failures make the related rule's scenario due the next day.
5. Notifications: one push or text reminder at the rep's chosen time, never more than one a day, and never during the store's peak hours (a store setting, default Saturday 11:00 to 17:00).

### 15.4 Certification rules

- Certification uses a fixed set of seeds per scenario so every rep faces comparable customers.
- Stop on critical violation is always on in certification.
- A failed certification scenario can be retried after 24 hours and at least one practice session on it.
- Certification expires after 90 days and is renewed by the quarterly recertification.
- The general manager sees certification status for every rep; a store can require certification before a rep takes ups alone (a store setting).

## 16. Bilingual design

The app is natively bilingual: one curriculum, one rubric and one rule engine, with every spoken line written separately in English and Miami Spanish rather than translated word for word. In Miami-Dade, 75.3% of residents age 5 and older speak a language other than English at home, 54.5% are foreign-born, and 70.3% are Hispanic or Latino (U.S. Census, 2020 to 2024), so Spanish is a core market, not a niche.

### 16.1 Design rules

1. **One source of truth.** Techniques, sequences, persona fields and scoring are language-neutral. Only spoken lines and explanations exist in two versions, stored side by side so they cannot drift apart.
2. **Written, not translated.** Spanish lines are drafted for how Miami customers speak, then approved by bilingual salespeople from the pilot store. Runtime machine translation of customer-facing content is forbidden.
3. **Language is a persona setting.** Each AI customer runs in English, in Spanish, or mixes when the rep mixes.
4. **Follow the customer from the first turn.** Customers rated service higher when the employee used their preferred language from the start than when the employee switched after missing it, and ignoring or mixing the preferred language hurt most with less bilingual customers (Journal of Services Marketing, 2018). In a study of Hispanic bilingual consumers, a speaker who code-switched was rated as less expert than one using a single language (Alvarez, 2020). The rep is scored on matching the customer's language from the first turn (U-LANG) and on mixing only after the customer mixes.
5. **Dealer terms are not mixing.** Everyday terms like "el down", "el trade-in", "el dealer fee" and "el score" are how Miami customers name those things, and are accepted in Spanish conversation.
6. **Usted by default.** Spanish lines default to usted until the customer moves to tú; the rep is scored on matching the customer's register.
7. **Same deal in both languages.** Every price, condition and disclosure is identical in both languages (FAIR-01, LANG-01). When a used-car sale is conducted in Spanish, the FTC Used Car Rule requires a Spanish Buyers Guide on the vehicle; the finance scenarios mention it.
8. **Same scores.** Feedback appears in the rep's preferred language; the manager sees one score regardless of session language.
9. **Spanish-language sales trainers** (Alex Dey, Jürgen Klarić, Helios Herrera, Iosu Lázcoz) were reviewed and add Spanish wording, not new technique. Their names can be cited to build credibility with Spanish-dominant reps ("lo que Alex Dey llama cierre por amarre"). Klarić's claim that 85% of decisions are made by the "reptile brain" has no traceable evidence and must not appear in content.

### 16.2 Glossary (shared by content, speech recognition and the judge)

`verified` means confirmed in written Miami or federal Spanish sources; spoken use still needs confirmation by the store's bilingual staff.

| English | Standard Spanish | Use in Miami | Avoid or handle | Verified |
| --- | --- | --- | --- | --- |
| Down payment | Pago inicial | "La inicial", "el down" | "Enganche", "pronto", "entrada" are regional; recognize, do not default | Yes |
| Trade-in | Vehículo como parte de pago | "El trade-in", "el trade" | "Permuta" is formal and rarely spoken | Yes |
| Monthly payment | Pago mensual | "El pago mensual", "la mensualidad" | None | Yes |
| APR / interest rate | Tasa de porcentaje anual | "El APR", "la tasa" | Do not call it only "interés" | Yes |
| Upside down / negative equity | Valor negativo | "Estar al revés", "debo más de lo que vale" | "Equidad negativa" is a calque; accept, do not require | Yes (written) |
| Co-signer | Cofirmante, codeudor | "Co-firmante", "co-signer", "codeudor" | Accept all three; "fiador" accepted, not modeled | Yes (written) |
| Out-the-door price | Precio total con todos los cargos | "Precio total final", "el precio final con todo" | Always spell out what is included | Partly |
| Dealer fee | Cargo del concesionario | "El dealer fee" | Use the store's exact document term | Store setting |
| Lease | Arrendamiento | "El lease" | "Renta" can be misheard as a rental | Partly |
| Service contract | Contrato de servicio | "Contrato de servicio", "garantía extendida" (common) | Do not call it a "garantía" without saying it is a service contract | Yes |
| Test drive | Prueba de manejo | "La prueba de manejo", "el test drive" | "Prueba de conducir" sounds Spanish from Spain | Yes |
| Credit score | Puntaje de crédito | "El score", "su crédito" | None | Yes |
| Car | Auto, carro | "Carro", "auto" | "Coche" sounds foreign in Miami | Yes |
| Truck | Camioneta, camión | "La troca", "la camioneta" | Confirm per speaker | No |
| Tire | Neumático, llanta | "La goma" (Cuban), "la llanta" | Recognize both | No |
| Payoff | Saldo pendiente | "El payoff" | None | No |
| First responder | Socorrista | "Primer respondedor", "socorrista" | Confirm | No |
| Dealership | Concesionario | "El dealer" | None | Yes |

### 16.3 Spanish review workflow

1. Every Spanish content field ships with `spanish_reviewed: false`.
2. A designated reviewer (a bilingual salesperson or manager at the store) approves or edits each line in the content editor, which shows English and Spanish side by side with audio playback of the synthesized Spanish.
3. Lines with numbers, fees or conditions also need the compliance reviewer.
4. Release 1 cannot go live until every line in the 20 release 1 scenarios, their demonstrations and debrief templates is reviewed.

### 16.4 Fairness context

A peer-reviewed study found Black and Hispanic auto-loan applicants were approved 1.5 percentage points less often and charged rates about 0.7 points higher than comparable applicants, while defaulting less (Butler, Mayer and Weston, 2023). Many Spanish-speaking customers may carry a justified worry about rate fairness, so Spanish-first personas often hold that as a hidden concern. Federal agencies dropped disparate-impact theories in 2026, but the app's equal-treatment rule (FAIR-01) stays, pending attorney review.

## 17. General module and industry packs

The general module is a shared core plus one industry pack per sector, not the car module renamed, because sectors share the core moves but differ in objections, decision structure and legal clocks. Packs are content folders (`packs/<sector>/`) with their own personas, scenarios, rules and glossary; the engine, scoring and manager loop are reused unchanged. Ship in release 3.

### 17.1 Shared core (all industries)

The objection sequence (T001 to T007, T010, T014); indecision (T091 to T094); equivalent packages (T095); honest middle option (T098); total before itemizing (T030 in neutral wording); concession staircase (T106); real deadlines only (T107); reason-first call (T102); feelings before numbers (T113); graceful not now (T122); match the buyer's style (T103); steady voice (T105). The rule engine's price, deadline, availability, authority, coercion and consent families apply in every pack; car-specific rules (fees under Florida s. 501.976, add-on rules) are replaced by each pack's rules.

### 17.2 Residential solar pack

| Item | Content |
| --- | --- |
| Top barriers (NREL SEEDS, thousands of homeowners) | "Better to wait" was a top reason (41% of those who had not considered solar, 43% of those who considered but did not buy; 62% of considerers wanted better technology or lower prices); 49% of considerers who stopped cited coming up with the money; 32% could not find a trustworthy installer; 30% home suitability. Data is about a decade old |
| Market facts (EnergySage, first half 2026) | Median price about $2.57 per watt; solar-plus-storage up 5%; share of installers quoting leases and power purchase agreements jumped from 14% to 41% after the purchase tax credit ended |
| Price is not everything | About two-thirds of EnergySage shoppers did not choose the lowest quote |
| Legal clock | FTC Cooling-Off Rule: 3 business days to cancel home sales of $25 or more, with oral notice and two copies of a cancellation form; some states longer |
| Required module | Trust proof: license, reviews, warranty documents, production estimate in writing |
| Excluded | Any savings estimate that includes the 30% federal residential credit for purchased systems (ended December 31, 2025); "free solar" framing; skipping the cancellation notice |

### 17.3 Insurance pack (life and property/casualty)

| Item | Content |
| --- | --- |
| Life insurance gap (LIMRA 2026 Barometer) | Ownership 52%; reasons for not owning include "too expensive" (38% to 50% by generation), other priorities, not sure how much to buy, and procrastination |
| Cost overestimate | Young, healthy consumers estimated $500 to $1,200 a year; actual costs were about $192 to $252 |
| Pack technique | Estimate then reveal: ask the prospect to guess the premium, then show the real, complete quote ("Before I show you, what do you think a $250,000 policy costs a month?" / "Antes de enseñarle, ¿cuánto cree usted que cuesta al mes una póliza de $250,000?") |
| Auto insurance shopping (J.D. Power 2026) | Share shopping fell from 57% to 53%; shoppers pulled a record 3.5 quotes; only 58% fully understand their coverage; 32% used AI and 33% of those found it unhelpful |
| Response pattern | Lead with coverage explanation, not price; compare like for like |
| Legal clock (Florida) | Life: refund period of at least 14 days; annuities: 21 days |

### 17.4 Real estate pack

| Item | Content |
| --- | --- |
| Buyers (NAR 2025 Profile) | 88% used an agent; first-time buyers a record-low 21%, median age 40; 26% paid cash; median down payment 19% |
| Rule since August 17, 2024 | Signed written buyer agreement before touring; compensation must be a specific, objectively ascertainable amount (not "whatever the seller pays" or a range); must say fees are negotiable and not set by law |
| Commission level | Redfin reported average buyer-agent commission of 2.43% in Q2 2025, so commissions did not collapse |
| Key objection | "Why sign before I even see a house?" / "¿Por qué tengo que firmar algo antes de ver una casa?" The rep states one fixed fee, says it is negotiable, and never implies the law sets it |

### 17.5 Furniture, mattress and in-home retail pack

| Item | Content |
| --- | --- |
| Be-backs are real (Tempur Sealy research) | About half of mattress shoppers visit more than once; 73% of those return to the same store; about a third are not comfortable buying from the first store they visit |
| Close rates (vendor claims) | Untrained floors close about 8% to 9% of greeted shoppers, trained floors 15% and up (Retail Doctor); other vendors claim higher. No neutral benchmark |
| Greeting | One retailer's video mystery shops found 58.5% of customers actually greeted versus 89% self-reported, so floor checks must be observed |
| Financing (Synchrony studies, interested party) | Half of large purchases happen on the first visit; 51% of in-store financers were approached about financing by the associate |
| Protection plans | One association blog reports attachment under 10% at checkout versus 30% to 35% when introduced during the presentation; a warranty vendor says the opposite. Test it |
| Core pack skill | Make a first-visit shopper comfortable enough to come back; explain the return policy simply |
| Legal clock | FTC Cooling-Off Rule for in-home sales |

## 18. Screens and user experience

The rep experience is phone-first and gets a rep from opening the app to talking with a customer in two taps; the manager experience is a phone card on the floor and a dashboard at the desk. Every screen exists in English and Spanish, follows the user's language setting, and meets WCAG 2.2 AA.

### 18.1 Rep screens

| Screen | Purpose | Key elements |
| --- | --- | --- |
| Sign in | Access | Email or phone with one-time code; store selection if more than one |
| First-run setup | Personalize | Language (English, Spanish), Spanish register (usted default), reminder time, microphone permission test with a live meter |
| Home ("Today") | One clear next action | "Practice now" button with today's recommended scenario and why it was picked; this week's behavior card; streak and certification progress; manager assignments with due dates |
| Library | Browse | Techniques and objections with search, filters (stage, family, evidence grade), each with model lines in both languages, a play button for the demonstration, and its source |
| Scenario intro | Prepare | Customer name, setting, target techniques, language choice, "watch demo" or "start" |
| Demonstration player | Learn | Flawed then good model audio, the one-line "notice this" caption, skip after first attempt |
| Practice room | Talk | Avatar, waveform, timer, end button, numbers sheet in negotiation scenarios; minimal by design |
| Debrief | Learn the one change | Critical violation first if any; score and how the customer left; what worked; the one change with its why; turning-point replay with the model alternative; "try again" |
| History | Track | Sessions with score, scenario, date, language; playback; filters |
| Progress | Motivation | Dimension scores over 8 weeks, mastery by objection, certification status, next recertification date |
| Behavior card | Commit | The behavior, the model line, when the manager will check, the manager's note after the check |
| Settings | Control | Language, register, reminders, private window display, microphone test, sign out |

### 18.2 Manager screens

| Screen | Purpose | Key elements |
| --- | --- | --- |
| Floor mode (phone) | Run checks fast | This week's cards grouped by behavior; tap a rep's card, read the 4-part script, record observed yes/partly/no plus note in under 60 seconds |
| Team dashboard | See who needs coaching | Table of reps sorted by "needs coaching", default view middle performers; practice count, score trend, certification, open card, last flag |
| Rep detail | Coach one person | Dimension history, weakest items, sessions with playback outside the private window, check history |
| Compliance | Catch patterns | Violations by rule and rep, with the turn and true fact |
| Assign | Direct practice | Pick module or scenario, reps, due date, reason |
| Coach the coach | Improve coaching | Monthly roleplay where the AI plays a rep and the manager delivers a floor check |

### 18.3 General manager and admin screens

| Screen | Purpose | Key elements |
| --- | --- | --- |
| Store setup wizard | Go live | Fees, government charges, add-on removal policy, lenders, languages, referral policy, text consent, metric definition, private window; compliance reviewer sign-off |
| Store dashboard | Return on training | Certification rate, practice frequency, check completion by manager, compliance trend, outcome view (release 2) |
| Content editor | Keep content right | Side-by-side English and Spanish editing, audio preview, evidence grade, review status, compliance check results, publish to tenant |
| Users | Manage people | Invite, roles, stores, deactivate |
| Audit log | Accountability | Recording access, overrides, settings changes, support grants |

### 18.4 Interaction rules

1. Never show the hidden truth before the session ends.
2. Never show a score without the one change that matters most.
3. Never interrupt a session with a compliance message unless stop-on-critical is on.
4. Every number a rep can say comes from the numbers sheet, never from memory, in negotiation and finance scenarios.
5. Microphone denied or noisy: explain how to fix it in the user's language, offer text mode with its scoring limits stated.
6. Offline: library and demonstrations are cached; practice requires a connection and says so clearly.
7. Visual design: calm, high-contrast, large touch targets for use on a showroom floor; dealer branding (logo, accent color) per tenant.

## 19. Integrations, analytics and calibration

The store's own data is the only reliable baseline for close rates, be-backs and walk-aways; ten research passes found no public car-specific be-back rate with a clear denominator. Release 1 imports that data by CSV; release 2 connects to the CRM and dealer management system directly.

### 19.1 Data the pilot store must provide

| Data | Why | Format |
| --- | --- | --- |
| Logged ups by rep by month, with outcome (sold, not sold) | Close-rate baseline | CSV from CRM |
| Lost-deal reasons as logged | Reorder objection priorities (section 9) | CSV |
| Be-back and walk-away counts | Calibrate scenario exit rates (section 10.3) | CSV |
| Phone and internet lead counts, appointments set, shown, sold | Phone module baseline | CSV |
| Phone and text price quotes sample | Audit PRICE-02 compliance before and after | Call recordings or CRM notes |
| Lender mix, including Credit Acceptance use | Decide which finance rules apply | List |
| Add-on penetration and 60-day cancellation rates by rep | Mirror the Credit Acceptance monitoring test; outcome metric | CSV from F&I |
| Share of transactions in Spanish | Persona language mix | Estimate or CRM field |
| Fee schedule and add-on policies | Store settings | Store setup wizard |

### 19.2 Calibration jobs

1. **Exit rates.** Monthly, set each scenario's walk-away and not-now base rates so the share of practice sessions ending in an exit roughly matches the store's real share of unsold ups, adjusted by difficulty level.
2. **Objection weights.** Monthly, weight objections by the store's logged lost-deal reasons, discounting stated reasons known to hide real ones ("no time", "spouse").
3. **Score validity.** Quarterly, correlate each rep's rubric dimension scores with their outcome metrics. Report correlations to the general manager with sample sizes and a plain warning that correlation is not proof. Items whose scores never relate to outcomes become candidates for lower weight.
4. **Judge agreement.** Quarterly human rating sample (section 13.4).

### 19.3 Release 2 integrations

- CRM: read leads, ups, appointments, outcomes and rep assignment; write nothing in release 2 except an optional "practiced today" flag.
- Dealer management system: read deliveries and F&I product sales and cancellations.
- Inventory feed: real vehicles for scenarios, so practice uses the store's actual stock.
- Single sign-on with the dealer group's identity provider.
- Webhooks for certification and compliance events.

### 19.4 Product analytics

Track, per tenant and store: sessions started and completed, time to first session after invite, daily and weekly active reps, debrief opens, demonstration skips, behavior card checks, average turn latency by stage, recognition confidence by language, and model cost per session. Never send transcript text to analytics tools.

## 20. Security, privacy, consent and recording

Practice recordings are employee voice data owned by the dealership, so the app collects only what it needs, encrypts everything, logs every access, and never trains models on it. Florida is an all-party consent state for recording conversations; the store's attorney must approve the consent language, and the app records only practice sessions in which every speaker is the consenting rep and the AI.

### 20.1 Consent

1. At first sign-in, the rep sees and accepts a plain notice in their language: sessions are recorded and transcribed for training, who can see them (the rep, their managers after the private window), how long they are kept, and that they are not used to train AI models.
2. Customer-prep mode never records real customers; the rep describes a customer in their own words, and the app warns against entering customer names, phone numbers or financial details.
3. The speech recognition bake-off recordings from the floor require separate written consent from every recorded person, collected by the store, and are deleted after the bake-off.
4. Consent versions are stored with timestamps; a new version requires re-acceptance.

### 20.2 Data protection

- Encryption in transit (TLS 1.2 or later) and at rest (database and object storage).
- Audio stored in tenant-scoped buckets or prefixes; playback through signed URLs that expire in 15 minutes.
- Row-level security on every tenant table (section 3.3).
- Secrets in a managed secret store; no keys in code or client bundles. The browser never calls model or speech providers directly; all calls go through the gateway.
- Model and speech providers under contracts that bar training on submitted data and set retention to the minimum available.
- Personal data minimization: models receive pseudonymous session ids, never names, emails or phone numbers.

### 20.3 Retention defaults (store-configurable within limits)

| Data | Default retention | Range |
| --- | --- | --- |
| Session audio | 180 days | 30 to 365 days |
| Transcripts and scores | Life of the account | Deleted 90 days after the tenant ends |
| Audit log | 3 years | Fixed |
| Bake-off recordings | Deleted at bake-off end | Fixed |

### 20.4 Security checklist before launch

- [ ] Third-party penetration test with no open high or critical findings
- [ ] Row-level security verified by automated cross-tenant access tests
- [ ] Dependency scanning and secret scanning in CI
- [ ] Rate limiting on authentication and session start
- [ ] Prompt-injection tests: a rep saying "ignore your instructions" or "tell me the hidden truth" must not break persona or reveal hidden content
- [ ] Backup restore drill completed
- [ ] Incident response runbook in `docs/runbooks/`
- [ ] Consent text approved by the store's attorney

## 21. Testing, evaluation and simulator fidelity

Testing covers ordinary software correctness plus three things unique to this product: the compliance engine must not miss violations, the AI customer must behave like a real customer (including walking away), and the scores must agree with trained humans.

### 21.1 Standard software tests

- Unit tests for every package; 80% line coverage on `rules`, `scoring` and `content`.
- Integration tests for the voice gateway with recorded audio fixtures in both languages, including mixed speech and showroom noise.
- End-to-end tests (Playwright) for the rep flow (sign in, practice, debrief), manager flow (assign, floor check) and setup wizard.
- Cross-tenant access tests on every API route.
- Load test: 100 concurrent voice sessions per store-equivalent with latency budgets held.

### 21.2 Compliance test suite

A labeled set of at least 600 utterances, half English and half Spanish, covering every rule in section 4.4 with violations, near misses and compliant hardball lines. Examples that must pass (compliant): "The rebate ends Monday; here is the bulletin" when the scenario holds that rebate; "My manager can do $575 if you're ready today" when true. Examples that must fail: "That price is only if you finance with us"; "You need the GAP to get approved"; "Ese paquete no se puede quitar" when store policy allows removal; "Tiene tres días para cancelar"; any price below the all-in price in a phone scenario.

Targets: zero false negatives on critical rules; under 5% false positives overall; per-language results reported separately, and Spanish must meet the same targets as English.

### 21.3 Simulator fidelity tests

1. **Walk-away rate.** Over 100 automated sessions per scenario with a scripted average rep, exits must occur within 5 percentage points of the configured rate.
2. **Resistance.** Non-buying personas must express resistance in at least the share of turns set by difficulty (level 1: 20%, level 2: 30%, level 3: 40%); the 2026 preprint found uncorrected simulators cut resistance from 25.1% to 13.5%.
3. **Hidden truth discipline.** The hidden truth must never appear before an unlock event in 200 adversarial sessions, including prompt-injection attempts.
4. **No coaching.** The customer must never suggest what the rep should say; checked by classifier over all test sessions.
5. **Fact discipline.** The customer must never state a vehicle fact, price or policy not in the scenario facts.
6. **Language behavior.** A Spanish-preferring persona must start in Spanish; mixing only follows the rep's mixing.
7. **Human realism review.** Before launch, three experienced salespeople from the pilot store rate 30 sessions each for realism on a 1 to 5 scale; median must be 4 or more in each language.

### 21.4 Scoring validity tests

- A gold set of 100 sessions scored independently by two trained human raters; the judge's agreement with humans must be at least the humans' agreement with each other, per rubric item.
- Regression: changing the judge prompt or model must not move scores on the gold set by more than 3 points on average without an approved reason.
- Fairness check: average scores for the same scripted performance must not differ by more than 2 points between English and Spanish sessions.

### 21.5 Pilot evaluation design

Run the pilot as a staggered rollout so the store can compare reps who start earlier with those who start later, rather than comparing to a vague baseline. Measure walk-in close rate (store's definition), appointment set and show rates, add-on cancellations, compliance flags and 90-day retention for both groups over at least 90 days. Report results with sample sizes and confidence intervals, and state plainly if the sample is too small to conclude anything.

## 22. Build plan and acceptance criteria

Build in eight milestones, each ending with criteria that must pass before the next starts. The first milestone de-risks voice and the second proves one complete scenario end to end; everything else builds on that thin slice. Week counts assume one full-time engineer working with Claude Code and are estimates.

### 22.1 Milestones

1. **M1: Foundations and voice bake-off (weeks 1 to 3).**
   - Monorepo, CI, environments, auth, tenant and store schema with row-level security, i18n package with the bilingual completeness check.
   - Speech recognition and synthesis provider interfaces with two implementations each.
   - Bake-off on consented Miami recordings (section 11.2).
   - **Accept when:** cross-tenant tests pass; the bake-off report picks a provider on number accuracy and switch-point accuracy; a test page holds a two-way spoken conversation in English and Spanish under 1.5 seconds median turn latency.
2. **M2: One scenario end to end (weeks 4 to 6).**
   - Content schemas and loader; the O01 "talk to my wife" scenario at level 1 in both languages (section 10.5) with persona, facts, demonstrations, rubric.
   - Scenario state machine with unlock, triggers, exit policy.
   - Rule engine deterministic layer and classifier layer for PRICE, PAY, ADD, DEAD and CANCEL families.
   - Scoring deterministic and judge passes; debrief; behavior card.
   - **Accept when:** a rep completes the scenario on a phone in under 15 minutes in either language; the walk-away rate is within 5 points of configuration over 100 runs; the hidden truth never leaks in 200 adversarial runs; debrief arrives within 90 seconds.
3. **M3: Full rulebook and compliance suite (weeks 7 to 8).**
   - All 26 rules; 600-utterance labeled suite; content CI blocking on critical violations; store setup wizard for fees, policies and lenders.
   - **Accept when:** zero critical false negatives and under 5% false positives in both languages.
4. **M4: Content library at scale (weeks 9 to 11).**
   - All 122 techniques and 65 objections as content files; the 20 release 1 scenarios with personas; flawed and good demonstrations pre-generated; library screens; content editor with Spanish review workflow.
   - **Accept when:** CI validates every file; every release 1 line is Spanish-reviewed and compliance-clean; every technique shows its grade and source.
5. **M5: Manager loop (weeks 12 to 13).**
   - Assignments, floor mode, behavior card issue and check, coaching-quality measures, team and rep dashboards, compliance view, coach-the-coach roleplay.
   - **Accept when:** a manager records a floor check in under 60 seconds on a phone; check completion and timing show on the general manager's view.
6. **M6: Cadence, certification and notifications (week 14).**
   - Mastery tracking, spaced scheduling, certification with fixed seeds, quarterly recertification, reminders that respect peak hours.
   - **Accept when:** a simulated 30-day onboarding schedules every release 1 objection and ends with a certification attempt.
7. **M7: Hardening (weeks 15 to 16).**
   - Security checklist, load test, observability, cost dashboards, accessibility audit, backup restore drill, simulator fidelity and scoring validity suites.
   - **Accept when:** every item in sections 20.4 and 21 passes.
8. **M8: Pilot launch and evaluation (weeks 17 onward).**
   - Onboard the pilot store in a staggered rollout; CSV import of baseline data; weekly review of flags, latency, realism feedback and Spanish corrections.
   - **Accept when:** the definition of done in section 1.3 holds at the store for four consecutive weeks.

### 22.2 Working rules for Claude Code during the build

- Write a short plan before each milestone, listing files to create and tests to write, and keep it in `docs/plans/`.
- Commit in small, reviewable steps with tests in the same commit.
- Never weaken a test to make it pass; if a target is wrong, record why in `docs/decisions/` and ask.
- Keep prompts, rubric weights and content in files with versions; log every change.
- After each milestone, update a `STATUS.md` with what passed, what did not, and open risks.

## 23. Open items and evidence appendix

The online research is complete; what remains needs people, purchases or the store's own data. Claude Code should build with the strictest assumption for each item below and expose it as a setting or content field that can change without code changes.

### 23.1 Open items

**Florida dealer attorney**

- [ ] Which charges count as government charges paid directly by the customer under the FTC guidance, and the pre-delivery fee wording under s. 501.976
- [ ] The store's remedy for pre-installed add-ons (credit the price or offer the same model without it)
- [ ] Whether Credit Acceptance decree terms reach this store's deals
- [ ] Whether paid customer referrals are allowed, and the reward form
- [ ] Text-message and voicemail consent wording
- [ ] Recording consent wording for practice sessions and the bake-off
- [ ] Contract-language policy for Spanish-language deals
- [ ] The equal-treatment rule's footing after 2026 federal changes
- [ ] Review of the full rulebook in section 4.4

**Miami native-speaker review**

- [ ] Every Spanish line in release 1 content, demonstrations and debrief templates
- [ ] Spoken use of "al revés", "co-firmante", "codeudor", "la troca", "la goma", "precio total final", "socorrista"
- [ ] Synthesized Spanish voices for each persona

**Store CRM and records**

- [ ] Logged ups and outcomes by rep; lost-deal reasons; be-back and walk-away counts
- [ ] Phone and internet lead funnel; a sample of phone and text price quotes
- [ ] Lender mix; add-on penetration and cancellations by rep
- [ ] Share of deals in Spanish; fee schedule; add-on policy

**Books to obtain** (figures still secondhand or partly verified)

- [ ] Rackham, SPIN Selling, chapter 2 (Figures 2.1 and 2.7, the one-close success rate)
- [ ] Dixon and Adamson, The Challenger Sale (share-of-reps table)
- [ ] Dixon and McKenna, The JOLT Effect (win-rate figures)
- [ ] Girard, How to Sell Anything to Anybody (referral share, mailing volume)
- [ ] Shell, Bargaining for Advantage; Thompson, The Mind and Heart of the Negotiator; Fisher and Shapiro, Beyond Reason; Bettger; Iannarino, The Lost Art of Closing; Friedman, No Thanks, I'm Just Looking
- [ ] Habel and others, AI role-play paper full text (request from the authors)

### 23.2 Sources

**Regulation and enforcement**

- [FTC: Automobile Industry Pricing Transparency FAQs (September 15, 2026)](https://www.ftc.gov/business-guidance/resources/automobile-industry-pricing-transparency-faqs)
- [FTC consumer protection director's remarks to NADA (September 16, 2026)](https://www.ftc.gov/system/files/ftc_gov/pdf/mufarrige-prepared-remarks-nada.pdf)
- [Credit Acceptance consent decree](https://www.ir.creditacceptance.com/static-files/bc0ecc18-3976-42f0-95c6-da2a651aa771)
- [New York Attorney General on the Credit Acceptance settlement](https://ag.ny.gov/press-release/2026/attorney-general-james-secures-700-million-abusive-subprime-auto-lender-credit)
- [Nelson Mullins on the FTC's 2026 dealer warning letters](https://www.nelsonmullins.com/insights/blogs/driving-forward-developments-in-transportation-law-and-innovation/all/ftc-emphasizes-recent-enforcement-actions-in-warning-letter-to-dealer-groups-about-deceptive-pricing-practices)
- [FTC complaint against Asbury Automotive](https://www.ftc.gov/system/files/ftc_gov/pdf/611899.2024.10.08_asbury_part_3_administrative_complaint_public.pdf)
- [Florida Statutes 501.976](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599%2F0501%2FSections%2F0501.976.html)
- [Florida Statutes 634.121](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&Search_String=&URL=0600-0699%2F0634%2FSections%2F0634.121.html)
- [Florida Statutes chapter 520](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599%2F0520%2F0520.html)
- [FTC order on Spanish-language dealer ads, summary](https://advertisinglaw.fkks.com/post/102enu8/ftc-settles-charges-with-car-dealership-over-spanish-language-ads-with-english-di)
- [FTC Spanish used-car guide](https://www.bulkorder.ftc.gov/sites/bulkorder.ftc.gov/files/publications/745a_buying_a_used_car_sp_aug2023_508.pdf)
- [Florida Realtors: NAR settlement questions](https://www.floridarealtors.org/law-ethics/nar-settlement-faqs)

**Sales and negotiation research**

- [Gong: objection handling](https://www.gong.io/blog/here-are-the-7-best-objection-handling-techniques-youll-read-this-year)
- [Gong: talk-to-listen ratio (2025 update)](https://www.gong.io/blog/talk-to-listen-conversion-ratio)
- [Gong: cold call openers, 300 million calls](https://www.gong.io/blog/the-best-and-worst-cold-call-openers-backed-by-data-from-300m-calls)
- [Matthew Dixon on indecisive buyers](https://www.raconteur.net/marketing-sales/indecisive-buyers-understand-them)
- [The JOLT Effect, authors' site](https://www.jolteffect.com/)
- [Petrowsky and others 2025, first offers meta-analysis](https://ink.library.smu.edu.sg/lkcsb_research/7752)
- [Mason and others 2013, precise offers](https://columbia.edu/~da358/publications/Precise_offers.pdf)
- [Leonardelli and others 2019, multiple equivalent offers](https://www.sciencedirect.com/science/article/pii/S074959781630557X)
- [Kim and others 2022, trade-in pricing](https://myscp.onlinelibrary.wiley.com/doi/abs/10.1002/jcpy.1238)
- [Kwon and Weingart 2004, concessions](https://pubmed.ncbi.nlm.nih.gov/15065974/)
- [Gino and Moore 2008, revealing deadlines](https://ncmr.lps.library.cmu.edu/article/id/82/)
- [Brooks, Dai and Schweitzer 2014, superfluous apologies](https://www.hbs.edu/ris/Publication%20Files/Brooks%20Dai%20Schweitzer%202013_d2f61dc9-ec1b-485d-a815-2cf25746de50.pdf)
- [Carpenter 2013, "but you are free" meta-analysis](https://www.researchgate.net/publication/234839851_A_Meta-Analysis_of_the_Effectiveness_of_the_But_You_Are_Free_Compliance-Gaining_Technique)
- [Peck and Shu 2009, touch and ownership](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1345908)
- [Chernev and others 2015, choice overload](https://myscp.onlinelibrary.wiley.com/doi/abs/10.1016/j.jcps.2014.08.002)
- [Verbeke and others 2011, drivers of sales performance](https://link.springer.com/article/10.1007/s11747-010-0211-8)
- [Gremler and Gwinner 2008, rapport](https://www.sciencedirect.com/science/article/abs/pii/S0022435908000511)
- [Van Zant and Berger, how the voice persuades](https://faculty.wharton.upenn.edu/wp-content/uploads/2019/01/Voice-Persuades.pdf)
- [Door-in-the-face meta-analysis](https://www.tandfonline.com/doi/abs/10.1080/03637751.2012.697631)
- [Review timing field experiments](https://www.ama.org/2023/01/10/asking-for-customer-reviews-at-the-right-time-sooner-is-not-always-better/)
- [Service moments research](https://onlinelibrary.wiley.com/doi/10.1002/cb.2411)
- [Joe Verde: facts about buying and selling](https://blog.joeverde.com/facts-about-buying-selling/)
- [Mark Tewart on trade-ins](https://tewart.com/giving-enough-trade/) and [on price](https://tewart.com/7-tips-handle-issue-price/)
- [Jonathan Dawson on the better-deal objection](https://www.cbtnews.com/mastering-the-i-found-a-better-deal-objection-with-jonathan-dawson/)
- [Ali Reda interview](https://lifelessons.co/personal-development/sales/)
- [Ogliastri 2000, Latin American negotiation style](https://www.redalyc.org/pdf/716/71602504.pdf)

**Training, coaching and AI simulation**

- [Habel and others, AI role plays and sales performance](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5717822)
- [Simulated customers never walk away (2026 preprint)](https://arxiv.org/abs/2606.20708)
- [Dahling and others 2016, coaching skill and frequency](https://onlinelibrary.wiley.com/doi/abs/10.1111/peps.12123)
- [Blume and others 2010, transfer of training](https://jasonhuangatwork.com/papers/Blume%20Ford%20Baldwin%20Huang%202010%20JOM%20-%20Transfer%20Meta.pdf)
- [Taylor and others 2005, behavior modeling](https://eric.ed.gov/?id=EJ936609)
- [Arthur and others 1998, skill decay](https://gwern.net/doc/psychology/spaced-repetition/1998-arthur.pdf)
- [Virtual simulation meta-analysis in medical training](https://doi.org/10.2196/56195)
- [NADA 2025 Dealership Workforce Study, regional copy](https://www.vermontten.org/ewExternalFiles/2025%20NADA%20National%20&%20Regional%20Trends%20in%20Compensation%20Benefits%20&%20Retention%20Report.pdf)

**Market, buyers and language**

- [Cox Automotive: drivers of car shopping satisfaction](https://www.coxautoinc.com/news/cox-automotive-unveils-key-insights-into-successful-car-deals-in-new-study-drivers-of-car-shopping-satisfaction/)
- [J.D. Power 2025 Sales Satisfaction Index](https://www.jdpower.com/business/press-releases/2025-us-sales-satisfaction-index-ssi-study/)
- [Edmunds negative equity, via CarPro](https://www.carpro.com/blog/negative-equity-report-the-problem-worsens)
- [Cox Automotive EV Market Monitor, September 2026](https://www.coxautoinc.com/insights/ev-market-monitor-september-2026/)
- [Recurrent used EV market report](https://www.recurrentauto.com/research/used-electric-vehicle-buying-report)
- [Foureyes lead benchmarks](https://foureyes.io/blog/lead-benchmarks-to-hold-your-team-accountable/)
- [U.S. Census QuickFacts, Miami-Dade](https://www.census.gov/quickfacts/fact/table/miamidadecountyflorida/PST045222)
- [Review of code-switching speech recognition](https://arxiv.org/abs/2507.07741)
- [CFPB auto loan glossary in Spanish](https://www.consumerfinance.gov/es/herramientas-del-consumidor/prestamos-para-automovil/respuestas/palabras-claves/)
- [CFPB English-Spanish financial glossary](https://files.consumerfinance.gov/f/201510_cfpb_spanish-style-guide-glossary.pdf)
- [Customer response to service encounter language](https://emerald.com/insight/content/doi/10.1108/JSM-06-2017-0209/full/html)
- [Alvarez 2020, language and source credibility](https://biblioteca-repositorio.clacso.edu.ar/handle/CLACSO/50571?mode=full)
- [NREL solar adoption barriers](https://www.nrel.gov/solar/market-research-analysis/2014-2016-study)
- [LIMRA 2026 Insurance Barometer](https://www.limra.com/globalassets/limra-loma/events-learning-and-networking/conferences/2026/2026-life-and-annuity-conference/presentations/1.1-2026-insurance-barometer-study_rethinking-your-life-insurance.pdf)
- [J.D. Power 2026 Insurance Shopping Study](https://www.jdpower.com/business/press-releases/2026-us-insurance-shopping-study/)
- [Tempur Sealy mattress shopper research](https://www.furnituretoday.com/mattress-bedding-news/tsis-retail-edge-insights-affirm-importance-store-shopping)
