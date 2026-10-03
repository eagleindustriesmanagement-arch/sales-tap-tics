# Industry packs: notes for reviewers (decision 0033)

Fifteen level-1 customers, five per industry, each with its persona and a learn-first lesson (decision 0031). All
fictional businesses: Cayo Verde Homes (homes), Lumacay Solar and Kestrela Lending (solar), Vellora / Tallerra /
Norcasa / Ravenna (furniture). Every scenario passes the release gate offline in both languages; the Spanish is
unreviewed and the customers practice but never certify.

| Industry | Objections | Hidden truths, in short |
|---|---|---|
| Homes (`HOM-*`) | O01, O05, O06, O04, O58 | preapproval below the price; never drove the commute at rush hour; landlord selling, must move by Jan 31; comparing to a 2005 resale; father with a walker, bedrooms upstairs |
| Solar (`SOL-*`) | O01, O05, O06, O04, O03 | 17-year-old roof; HOA approval for street-facing panels; may sell in three years; neighbor's "30% back"; thought the battery was required |
| Furniture (`FUR-*`) | O01, O05, O06, O04, O03 | the dog and a light couch; Nochebuena delivery for 14; closing on a first condo; a "similar" set online for less; a $240 monthly ceiling |

## Claims the content deliberately does not make

- No tax credit, rebate, utility savings, net-metering term, home value, interest rate, mortgage payment, loan
  approval or drive time is stated as fact anywhere. Reps send tax questions to a tax professional and mortgage
  numbers to the customer's lender.
- Homes are finished quick move-in homes: the engine's availability rule (AVAIL-02) only understands car wording for
  units not yet built.
- Furniture avoids the word "warranty" (the Florida service-contract rule is car-only) and makes no refund or
  cancellation claim about the protection plan.

## Spanish for a native Miami reviewer

- **Homes:** el lender, el loan officer, los closing costs, el builder, townhome(s), quick move-in, el listing, el
  walk-in closet, el down; preaprobación, hora pico, tranque, reventa, "listada en", el aire (AC), "le cotice las
  dos direcciones", "un barril sin fondo", andador, casita, "consultarlo con la almohada".
- **Solar:** visita técnica (site survey), conexión a la red (interconnection), fichas técnicas, "carta de
  violación" (calque of violation letter), "la HOA", "la high school", realtor, preparador de taxes / contador,
  "llamada brava", "le dé vueltas", "muerto del cansancio", estimado, monitoreo, batería de respaldo, "el bill de la
  luz"; "sujeto a la aprobación del banco" where Kestrela is a lender, not a bank.
- **Furniture:** "me cogieron de boba" (fine in Cuban Miami, vulgar elsewhere), el sectional, el family room,
  white-glove, performance, top-grain, el link, el down, condo; gavetas, volante (flyer), enchapado, roble macizo,
  "terciopelo performance color marfil", brackets (braces), calladito.

## Engine gaps the authors found

Fixed (RATE-01, with regression tests in `packages/rules/test/engine-gaps.test.ts`):

- A monthly payment stated when nothing was quoted (no payment options, no manager authority on payments) is made
  up and flagged; the customer's own budget ("you said under $3,900 a month") and small monthly costs under $50 are
  not.
- A promised approval ("the lender will approve you", "lo van a aprobar") is an approval claim; "I can't promise",
  "no le puedo prometer", a question or a condition is not.

Still open (the live judge is the backstop):

- "Free" in Spanish for a charged fee ("La entrega es gratis") is not caught when the fee code is English.
- "Ours is $9,498 with delivery" is not read as a price claim.
- "You need the plan to get approved" is not tied to the protection plan add-on.
- Deferred-interest promises without a percent ("no interest if paid in full in 12 months") are not caught.
