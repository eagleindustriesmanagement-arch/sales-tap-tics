# Spanish style guide (es-US, Miami)

Source: Spanish Localization Guide for Claude Code (Eagle Industries LLC, Oct 1, 2026), sections 3 to 6. This file is the source of truth for register, tone, terminology, formatting and examples; packages/i18n/glossary.yaml holds the glossary in machine-checkable form.

## 3. Spanish style guide

The app's Spanish is U.S. Spanish as spoken in Miami (locale `es-US`): warm, direct, short, respectful, and free of Spain-only words. When in doubt, write what a bilingual Miami sales manager would say to a coworker or a customer.

### 3.1 Register

- **Customer dialogue** (AI customers, model lines, scripts): usted by default. Switch to tú only if the customer does first.
- **App interface** (talking to the salesperson): usted, applied the same way everywhere. Avoid needing a pronoun at all where you can, with infinitive buttons and impersonal phrasing ("Empezar práctica", "Se guardó su sesión").
- Never mix tú and usted on one screen or in one message.
- Never use vosotros.

### 3.2 Tone

- Short sentences. Spanish that copies English length sounds stiff; cut words English needed but Spanish does not.
- Plain words over formal ones: "empezar" not "iniciar" in casual spots, "usar" not "utilizar", "hacer" not "realizar".
- Warm but not flowery. No "estimado usuario".
- Encouraging in feedback without exaggeration: "Buen trabajo con la pausa" rather than "¡Excelente desempeño extraordinario!"

### 3.3 Interface conventions

| Element | Rule | Example |
| --- | --- | --- |
| Buttons | Infinitive verb, short | "Guardar", "Empezar práctica", "Volver a intentar" |
| Instructions | Usted imperative | "Toque el micrófono para empezar." |
| Titles and headings | Sentence case: only the first word and names capitalized | "Su progreso esta semana", not "Su Progreso Esta Semana" |
| Questions and exclamations | Always open with ¿ and ¡ | "¿Listo para practicar?" |
| Days and months | Lowercase | "lunes 5 de octubre" |
| Dates | Spell the month to avoid month-day confusion | "1 de oct. de 2026" |
| Times | 12-hour with a. m. and p. m. | "5:30 p. m." |
| Money | U.S. format with the dollar sign before the number | "$1,250.00", "$38,450" |
| Percentages | Number, space optional by style; pick one and keep it | "25%" |
| Gender | Prefer neutral phrasing over "o/a" | "Le damos la bienvenida" instead of "Bienvenido/a" |
| Errors | Calm, plain, with what to do next | "No pudimos guardar la sesión. Revise su conexión e intente de nuevo." |
| Empty states | Say what to do | "Todavía no tiene sesiones. Empiece su primera práctica." |

### 3.4 Miami vocabulary

Use the words Miami speakers use, not Spain's or Mexico's when they differ.

| Use | Not | Meaning |
| --- | --- | --- |
| carro, auto | coche | car |
| celular | móvil | cell phone |
| computadora | ordenador | computer |
| manejar | conducir (acceptable but less common) | drive |
| parquear, estacionar | aparcar | park |
| la troca, la camioneta | el camión (for pickups) | pickup truck |
| la goma, la llanta | el neumático | tire |
| ahorita (now, soon) | ahora mismo (fine), vale (never) | right now |

Dealership anglicisms are normal and correct here: "el trade-in", "el down", "el dealer", "el lease", "el score", "el payoff", "el test drive". Do not replace them with textbook Spanish in dialogue.

### 3.5 False friends to catch

| English | Wrong | Right |
| --- | --- | --- |
| Apply (for credit) | aplicar | solicitar |
| Realize | realizar | darse cuenta |
| Support (help) | soportar | apoyar, ayudar |
| Assist | asistir | ayudar |
| Actually | actualmente | en realidad |
| Eventually | eventualmente | con el tiempo |
| Introduce (a person) | introducir | presentar |
| Library (of content) | librería | biblioteca |
| Record (audio) | recordar | grabar |
| Score (rating) | marcador | puntaje |

## 4. Approved glossary

Every term below must be translated the same way everywhere in the app; Claude Code should store this table as `packages/i18n/glossary.yaml` and check each batch against it. Terms marked "confirm" need a Miami salesperson's approval before release.

### 4.1 App interface

| English | Spanish | Note |
| --- | --- | --- |
| Sign in / Sign out | Iniciar sesión / Cerrar sesión |  |
| Settings | Configuración |  |
| Home / Today | Inicio / Hoy |  |
| Dashboard | Panel | Not "tablero de control" |
| Practice (noun) | Práctica |  |
| Start practice | Empezar práctica | Button |
| Session | Sesión |  |
| Roleplay | Simulación | "Juego de roles" sounds like a game; confirm |
| Demonstration | Demostración, ejemplo | "Ver ejemplo" for the button |
| Debrief | Resumen de la sesión |  |
| Score | Puntaje | Not "puntuación" (Spain) or "marcador" |
| Behavior card | Meta de la semana | Says what it is; confirm |
| Floor check | Revisión en el piso | Confirm with managers |
| Assignment | Tarea asignada |  |
| Due date | Fecha límite / Vence el | "Vence el viernes" |
| Certification | Certificación |  |
| Streak | Racha |  |
| Progress | Progreso |  |
| Library | Biblioteca | Not "librería" |
| Technique | Técnica |  |
| Objection | Objeción |  |
| Evidence grade | Nivel de evidencia |  |
| Microphone | Micrófono |  |
| Allow access | Permitir acceso |  |
| Try again | Volver a intentar |  |
| Loading | Cargando… |  |
| Something went wrong | Algo salió mal |  |
| Saved | Guardado |  |
| Private | Privado |  |
| Manager | Gerente |  |
| Salesperson | Vendedor, vendedora | Use neutral phrasing when gender is unknown |
| BDC agent | Agente de BDC | Keep "BDC" |

### 4.2 Sales and car terms

| English | Spanish | Note |
| --- | --- | --- |
| Customer | Cliente |  |
| Up (a showroom customer) | Cliente, "un up" | Confirm if reps say "up" |
| Close (the sale) | Cierre, cerrar la venta | Never confuse with the "Cerrar" button |
| Objection handling | Manejo de objeciones |  |
| Walkaround | Recorrido del vehículo |  |
| Test drive | Prueba de manejo | "El test drive" in dialogue is fine |
| Down payment | La inicial, el down |  |
| Trade-in | El trade-in |  |
| Monthly payment | Pago mensual |  |
| Interest rate / APR | La tasa / el APR | Not only "interés" |
| Out-the-door price | Precio total final | Spell out what is included |
| Dealer fee | Cargo de concesionario, el dealer fee | Use the store's exact document term |
| Upside down | Estar al revés, deber más de lo que vale |  |
| Co-signer | Co-firmante | Accept "co-signer" and "codeudor" |
| Credit score | Puntaje de crédito, el score |  |
| Lease | El lease, arrendamiento |  |
| Service contract | Contrato de servicio | Do not call it only "garantía" |
| Warranty | Garantía |  |
| Finance manager | Gerente de financiamiento |  |
| Appointment | Cita |  |
| Follow-up | Seguimiento |  |
| Referral | Referido |  |
| Payoff | El payoff, saldo pendiente |  |

## 5. Before and after

These examples teach Claude Code the difference between translated and native Spanish; include them in the style guide file and in the AI prompts. The "literal" column shows the typical machine-translation mistake.

### 5.1 Interface

| English | Literal (wrong) | Native | Why |
| --- | --- | --- | --- |
| Start Your Practice Session | Comience Su Sesión De Práctica | Empezar práctica | Button: short infinitive, sentence case |
| You have 3 new assignments waiting for you | Usted tiene 3 nuevas asignaciones esperándolo | Tiene 3 tareas nuevas | Spanish drops what English needs |
| Great job! You nailed the pause. | ¡Gran trabajo! Usted clavó la pausa. | ¡Muy bien! La pausa le salió perfecta. | Idiom rewritten, not translated |
| Your score | Su marcador | Su puntaje | Glossary |
| Close | Cierre | Cerrar | Button that closes a window |
| Please allow microphone access to continue | Por favor permita acceso al micrófono para continuar | Para continuar, permita el acceso al micrófono. | Natural order; "por favor" adds little |
| Oops! Something went wrong. | ¡Uy! Algo fue mal. | Algo salió mal. Intente de nuevo. | "Ir mal" is Spain usage; say what to do next |
| Welcome back, Carlos! | ¡Bienvenido de vuelta, Carlos! | ¡Hola de nuevo, Carlos! | Avoids gender and sounds natural |
| 1 sessions completed | 1 sesiones completadas | 1 sesión completada | Plural rule (section 6) |
| Apply for financing | Aplicar para financiamiento | Solicitar financiamiento | False friend |
| Due Friday | Debido el viernes | Vence el viernes | Calque fixed |
| Record a session | Recordar una sesión | Grabar una sesión | False friend |

### 5.2 Customer dialogue

| English | Literal (wrong) | Native Miami | Why |
| --- | --- | --- | --- |
| I need to talk to my wife first. | Necesito hablar con mi esposa primero. | Tengo que hablarlo con mi esposa antes. | Natural phrasing |
| I'm upside down on my loan. | Estoy boca abajo en mi préstamo. | Debo más de lo que vale el carro. | Idiom, not words |
| I'm just looking. | Solo estoy buscando. | Solo estoy mirando. | "Buscando" means searching for something specific |
| What's my out-the-door price? | ¿Cuál es mi precio fuera de la puerta? | ¿Cuánto me queda el precio total, con todo? | Never translate the idiom literally |
| Can you do better on my trade? | ¿Puede hacer mejor en mi intercambio? | ¿No me puede dar un poquito más por el trade-in? | Miami dealer term; natural softener |
| The payment's too high. | El pago es demasiado alto. | El pago está muy alto. | "Estar" for a current condition |
| Let me think about it. | Déjame pensar acerca de eso. | Déjeme pensarlo. | Usted; shorter |
| My credit isn't great. | Mi crédito no es grande. | Mi crédito no está muy bien. | "Grande" means size |
| Does it come in blue? | ¿Viene en azul? | ¿Lo tienen en azul? | How customers actually ask |

### 5.3 Rep model lines

| English | Literal (wrong) | Native Miami |
| --- | --- | --- |
| Help me understand. What number were you expecting? | Ayúdame a entender. ¿Qué número estabas esperando? | Ayúdeme a entender. ¿Qué número tenía en mente? |
| That's fair. It's a big decision. | Eso es justo. Es una gran decisión. | Tiene toda la razón. Es una decisión importante. |
| Does tomorrow at 5:30 or Saturday at 10 work better? | ¿Funciona mejor mañana a las 5:30 o sábado a las 10? | ¿Le queda mejor mañana a las 5:30 o el sábado a las 10? |
| Take it around the block. | Tómelo alrededor del bloque. | Déle una vuelta. |
| I'll have it pulled up front. | Lo tendré tirado al frente. | Se lo tengo listo al frente. |

## 6. Code fixes that make Spanish grammatical

Much "bad translation" is really bad code: no translator can fix a sentence the app assembles from pieces. Claude Code should make these changes before rewriting any text.

1. **One message per sentence, never concatenation.** Spanish word order, gender and plurals differ from English, so a sentence built from pieces cannot be fixed by translating the pieces.

```ts
// Wrong: breaks in Spanish
t("you_have") + " " + count + " " + t("new_sessions")

// Right: one ICU message per sentence
t("sessions_waiting", { count })
```

2. **Plurals with ICU MessageFormat.**

```json
{
  "sessions_waiting": {
    "en": "{count, plural, =0 {No sessions waiting} one {# session waiting} other {# sessions waiting}}",
    "es": "{count, plural, =0 {No tiene sesiones pendientes} one {Tiene # sesión pendiente} other {Tiene # sesiones pendientes}}"
  }
}
```

3. **Gender with select, when gender is known.** Otherwise rewrite to a neutral phrase.

```json
{
  "certified": {
    "es": "{gender, select, female {Ya está certificada} male {Ya está certificado} other {Ya tiene su certificación}}"
  }
}
```

4. **A context comment on every key**, so the writer knows what the text is and where it appears.

```json
{
  "close_button": { "en": "Close", "es": "Cerrar", "_context": "Button that closes the debrief panel. Not the sales close." },
  "close_technique": { "en": "Close", "es": "Cierre", "_context": "The sales technique of asking for the decision." }
}
```

5. **Format numbers, money, dates and times with the locale**, never by hand: `new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" })` and `new Intl.DateTimeFormat("es-US", { dateStyle: "medium" })`. Check the output matches the style guide; adjust with options if not.
6. **Room to grow.** Spanish runs 20% to 30% longer. Use flexible layouts; never fixed-width buttons. Test with pseudo-localization (each string padded by 35% and wrapped in brackets) to catch truncation and any hard-coded English still on screen.
7. **No hard-coded text.** Add a lint rule that fails the build when a component renders a raw string literal instead of a translation key.
8. **Speech output.** Before sending Spanish to speech synthesis, convert numbers and money to words in Spanish ("treinta y ocho mil cuatrocientos cincuenta dólares") and keep anglicisms like "trade-in" pronounced the way Miami speakers say them. Listen to every persona voice in Spanish before release.
9. **AI prompts write Spanish directly.** The AI customer, demonstrations and debriefs must be prompted in Spanish with the style guide and examples, and told to write natively, never to translate an English draft. Translating model output from English at runtime is what produces stiff dialogue.
10. **One source of truth per string.** English and Spanish live side by side in the same file with the same key, and CI fails if either is missing.

