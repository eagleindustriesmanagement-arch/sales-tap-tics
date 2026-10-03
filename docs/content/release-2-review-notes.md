# Release 2 customers: what the reviewers should check first

45 level 1 scenarios, one for each objection that release 1 did not cover (decision 0017). Each one passed these
checks:

- the schemas;
- the content compliance check;
- the release gate: in both languages, the good demonstration reveals the hidden truth and wins with no critical
  violation, and the flawed one never reveals it.

The authors listed the words and claims they were least sure of. Every Spanish line also goes through the Spanish
review screen (decision 0010). Release 1 does not wait on these.

## Real-world claims to confirm (compliance reviewer)

| Scenarios | Claim |
| --- | --- |
| O47 three-day cancel | Florida has no three-day cooling-off period for a car bought at the dealership (the CANCEL-01 rule's own statement). |
| O49 GAP, O54 warranty | GAP is optional and not required for approval (ADD-01). A Florida service contract can be cancelled within 60 days for a full refund, less claims paid and an admin fee of up to 5%, and prorated after that (ADD-04). The GAP definition is copied from S-no-extras-L2. |
| O44 tax credit | The federal new-EV credit ended for vehicles acquired after September 30, 2025. The good rep confirms the customer is right. |
| O28 to O32, O48 (EVs) | The rep states no range, charging or warranty figure from memory. Instead the rep reads the window sticker, has an electrician check the panel, pulls a battery report on the car, and looks up the factory battery warranty by VIN. Heat, air conditioning and highway speed lower range. |
| O53 plain words | APR in plain words: "what the loan costs you per year, as a percentage" (a simplification). |
| O45, O17, O24, O43, O61 | No price, rate, resale or new-model prediction anywhere. A closed-end lease sets its end value in the contract. |
| O11, O12, O13, O21, O35, O36, O52 | The lender decides approval, rate and zero down. People file taxes with an ITIN. A co-signer is responsible for the loan if payments are missed. One all-in price holds with any financing (PRICE-04). |
| O34 Spanish contract | Whether the store offers a Spanish contract is deliberately left out of the facts: it is a store policy, to set with counsel. |
| All | Vehicle trims, colors and prices are realistic stand-ins, not checked against 2026 Chevrolet MSRPs. The authors were least sure of: Equinox EV LT, Trax 1RS and 2RS, "Cacti Green" (Trax), "Iridescent Pearl Tricoat" (Blazer), "Crush Orange" and "Harbor Blue". Payments are estimates and are called estimates. |
| O25 hybrid, O30 home charging | No new Chevrolet hybrid is claimed. O25 shows a used 2022 RAV4 Hybrid that is in transit. O30 shows gas alternatives. |

## Content choices to confirm (owner)

- O27 (can't work the features) is a delivery follow-up. Its facts model the sold car as in stock with no others
  of that trim and color, and the loan as approved.
- O31 (battery won't last) uses a used 2024 Blazer EV, because the battery-report technique is for used EVs.
- O32 (EVs cost too much) leaves out service costs: there were no verified maintenance figures.
- O40 (discount back home) skips the concession ladder (T042): the manager has no room in this scenario.
- O39 (spoken to in Spanish unasked) has a customer who prefers English until he is asked. On purpose, his
  English-only lines also appear in the Spanish session. Check this one with the live AI customer.
- O51's English opening is a rendering: the objection file's English text is empty.

## Spanish to check (Miami native speaker)

- **Loanwords left in English:** el down, el trade-in, el lease, el charger, el sticker, el VIN, el parking, el
  screenshot, el oil change, el service, el warranty, el pickup, los pay stubs, pagar cash, el all-wheel drive, APR,
  term and TTL (kept on purpose in O53), drywall, tag.
- **Word choices:**
  - co-firmante / codeudor / fiador;
  - cooperativa / el credit union;
  - talones de pago / pay stubs;
  - aplicar / solicitud;
  - camioneta / troca for a pickup;
  - maletero / baúl;
  - placa / tag;
  - aseguranza / seguro;
  - concesionario / dealer;
  - la aplicación / el app;
  - tasar / tasación.
- **Expressions:**
  - Getting stranded or burned: quedarse botado or embarcada; varados en el Turnpike; salí perdiendo; gato por
    liebre; cambiazo; puro cuento; letra chiquita.
  - Brush-offs and pushback: le sacó el cuerpo; despachó / me despacharon; Ya esta película yo la vi; se pone
    brava; me hace sentido.
  - Thinking it over: darle vueltas; consultar con la almohada; voy y vengo.
  - Money: colchón / colchoncito de ahorros; ni un peso de down; 40 y pico; la cuenta de gasolina; le echo unos
    $320 al mes de gasolina; el pago le cuadra en el presupuesto.
  - The car: camina (the truck runs); jala; la transmisión está patinando; golpe en el bumper; las gomas; gomas y
    rines; se traba.
  - Places and driving: cojo / agarro el Palmetto, el Turnpike; se mudó para Brickell; cargadores del shopping;
    parqueada; rastras.
  - Diminutives and interjections: rapidito; momentico; jueguitos; chiquita (of a car); Mire eso; Ja; Dele;
    Chao; Vámonos, mijo; mi señora; mi hermano (a rep to a customer).
  - Other phrases: dejemos escrito el negocio; tenía separada una prueba de manejo; ambas Equinox;
    período de arrepentimiento; materiales del taller; una respuesta derecha.
- **Openers to hear aloud:** "Tranquilo. Yo no tengo ningún apuro." (O63); "Mmm. Bueno." (O62); "Bien, gracias.
  Pero... English is fine." (O39).
- **Voices:** some female first names in the name pools need a female voice: Yanelis, Daymí, Mileidy. One good rep
  is a woman ("sincera", "juntas", in O61).

## Engine notes the authors hit

- Fixed:
  - Spanish "las dos + noun" was read as 2:00.
  - A lone "un" / "una" was read as $1.
  - "Another $2,000" was read as a trade total.
  - Any small number before a day counted as an appointment time.
- Kept on purpose: "Si no decide hoy, termina pagando más" stays a DEAD-01 violation (strictest reading). An
  innocent "termina pagando" with no day in it is not flagged.
- Open:
  - Walk-out trigger cues ignore negation ("I won't tell you there's only one bank" fires the trigger).
  - The universal language item U-LANG can score an opening as "unknown" (1 point).
  - In a phone callback, the customer speaks first. O56's good rep now gives name, store and reason anyway.
- Process: two authors used `git stash` at the same moment. Git keeps one stash for all worktrees, so their files
  were swapped. Nothing was lost. Parallel authors must never use `git stash`.
