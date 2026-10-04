# Spanish batches 1 and 2: for review

Status: **on the working branch, not on main.** Per the localization guide, nothing merges until approved. Every
row keeps `spanish_reviewed: false` meaning until a Miami reviewer reads it aloud (guide section 7).

## Batch 1: code (docs/i18n/spanish-audit.md section A)

- **Plurals.** `t()` understands ICU plurals (`{n, plural, one {…} other {…}}`, chosen by each language's own
  rules), so a count of 1 reads "Queda 1 turno", "1 día practicando", "hace 1 día" instead of "Quedan 1 turnos". Tested
  for 0, 1 and many.
- **Context notes** for the 43 ambiguous keys (`packages/i18n/src/context.ts`): what each string is and where it
  shows, starting with "Close", "Open", "Score", "Close rate", "Ups". Rewritten keys get a note in every later batch.
- **Nothing written straight into a screen.** A CI test parses every screen and fails on literal text or a literal
  `aria-label`, `placeholder`, `title` or `alt`. It found ten; all now go through the translations: the sign-in
  headline, the skip link, the language picker's label, two navigation labels, the evidence-grade label and the
  usted/tú choices. Language names ("English", "Español"), the brand, "ms" and text hidden from screen readers are
  allowed on purpose.
- **Padded-text pass.** A build with every Spanish string 35% longer, walked at phone width as a rep and a manager
  over 12 screens. Found and fixed: list titles cut to one line with "…" (Spanish titles now wrap to two lines),
  lesson step labels cut off, one Settings row that could push the page sideways. After the fixes: nothing cut off,
  no sideways scrolling, and no interface text left outside the translations.

New and changed interface strings in batch 1:

| Key | Old English | New English | Old Spanish | New Spanish |
| --- | --- | --- | --- | --- |
| nav.main | (new) | Main | (new) | Principal |
| a11y.skip | (new) | Skip to content | (new) | Ir al contenido |
| language.label | (new) | Display language | (new) | Idioma de la pantalla |
| auth.hero | (new) | The hard ups, | (new) | Los clientes difíciles, |
| auth.heroAccent | (new) | here first. | (new) | aquí primero. |
| store.register.usted | (new) | usted (formal) | (new) | usted |
| store.register.tu | (new) | tú (informal) | (new) | tú |
| library.gradeLabel | (new) | Evidence grade | (new) | Nivel de evidencia |
| practice.tried | {n} tries, no complete score yet | {n, plural, one {# try} other {# tries}}, no complete score yet | {n} intentos, todavía sin puntaje completo | {n, plural, one {# intento} other {# intentos}}, todavía sin puntaje completo |
| practice.turnsLeft | {n} turns left | {n, plural, one {# turn left} other {# turns left}} | Quedan {n} turnos | {n, plural, one {Queda # turno} other {Quedan # turnos}} |
| practice.levelProgress | {passed} of {total} passed | {passed} of {total} passed | {passed} de {total} aprobados | {passed} de {total, plural, one {# aprobado} other {# aprobados}} |
| plan.due | Due for review: {days} days since you practiced it. | Due for review: {days, plural, one {# day} other {# days}} since you practiced it. | Toca repasar: hace {days} días que no lo practica. | Toca repasar: hace {days, plural, one {# día} other {# días}} que no lo practica. |
| plan.dueItems | Covers {n} skills due for practice. | Covers {n, plural, one {# skill} other {# skills}} due for practice. | Cubre {n} habilidades que toca practicar. | Cubre {n, plural, one {# habilidad que toca} other {# habilidades que toca}} practicar. |
| today.streak | {n}-day practice streak | {n}-day practice streak | {n} días seguidos practicando | {n, plural, one {# día practicando} other {# días seguidos practicando}} |
| validity.cell | {r} ({n} reps) | {r} ({n, plural, one {# rep} other {# reps}}) | {r} ({n} vendedores) | {r} ({n, plural, one {# vendedor} other {# vendedores}}) |
| progress.thisWeek | This week (since {date}) · {n} complete sessions | This week (since {date}) · {n, plural, one {# complete session} other {# complete sessions}} | Esta semana (desde el {date}) · {n} sesiones completas | Esta semana (desde el {date}) · {n, plural, one {# sesión completa} other {# sesiones completas}} |
| today.skills | {n} skills | {n, plural, one {# skill} other {# skills}} | {n} habilidades | {n, plural, one {# habilidad} other {# habilidades}} |
| library.results | {count} results | {count, plural, one {# result} other {# results}} | {count} resultados | {count, plural, one {# resultado} other {# resultados}} |
| debrief.reviewFlags | {count} flagged for review | {count} flagged for review | {count} marcados para revisión | {count, plural, one {# marcado} other {# marcados}} para revisión |
| floor.recorded | Recorded in {seconds} seconds. | Recorded in {seconds, plural, one {# second} other {# seconds}}. | Registrado en {seconds} segundos. | Registrado en {seconds, plural, one {# segundo} other {# segundos}}. |
| invites.linkFor | {role} link · {n} joined | {role} link · {n} joined | Enlace de {role} · {n} se unieron | Enlace de {role} · {n, plural, one {# se unió} other {# se unieron}} |
| team.repLine | {n} sessions this week · {cert} certified | {n, plural, one {# session} other {# sessions}} this week · {cert} certified | {n} sesiones esta semana · {cert} certificados | {n, plural, one {# sesión} other {# sesiones}} esta semana · {cert} certificados |
| team.flagCount | {n} critical | {n} critical | {n} críticas | {n, plural, one {# crítica} other {# críticas}} |

## Batch 2: the glossary's terms (your choice: glossary terms now)

Three of these terms are marked "confirm" in the guide (Revisión en el piso, Meta de la semana, Simulación): a
Miami salesperson should still approve them. Due dates now read "Vence el …" (glossary: Due → Vence el).

| Key | English | Old Spanish | New Spanish | Reason |
| --- | --- | --- | --- | --- |
| settings.title | Settings | Ajustes | Configuración | Glossary: Settings |
| dash.checks | Floor checks done, last 4 weeks | Chequeos en el piso hechos, últimas 4 semanas | Revisiones en el piso hechas, últimas 4 semanas | Glossary: Floor check (confirm) |
| dash.cards | Cards checked | Tarjetas revisadas | Metas revisadas | Glossary: Behavior card (confirm) |
| progress.cards | Behavior cards | Tarjetas de comportamiento | Metas de la semana | Glossary: Behavior card (confirm) |
| usage.cards | Behavior cards checked | Tarjetas de conducta revisadas | Metas de la semana revisadas | Glossary: Behavior card; one term instead of two (comportamiento / conducta) |
| coach.intro | Once a month, practice a floor check on a rep before you do it for real. It is scored on the four parts: what you saw, the one behavior, the exact line, when you will check again. | Una vez al mes, practique un chequeo en el piso con un vendedor antes de hacerlo de verdad. Se califica en las cuatro partes: lo que vio, el único comportamiento, la frase exacta y cuándo lo vuelve a revisar. | Una vez al mes, practique una revisión en el piso con un vendedor antes de hacerla de verdad. Se califica en las cuatro partes: lo que vio, el único comportamiento, la frase exacta y cuándo lo vuelve a revisar. | Glossary: Floor check; revisión is feminine, so hacerla |
| coach.task | Give the floor check for: {card}. One behavior, the exact line, and when you will check again. | Haga el chequeo para: {card}. Un solo comportamiento, la frase exacta y cuándo lo vuelve a revisar. | Haga la revisión para: {card}. Un solo comportamiento, la frase exacta y cuándo lo vuelve a revisar. | Glossary: Floor check |
| coach.submit | Score my floor check | Calificar mi chequeo | Calificar mi revisión | Glossary: Floor check |
| coach.model | The card's wording for what was missing | Cómo lo dice la tarjeta, para lo que faltó | Cómo lo dice la meta de la semana, para lo que faltó | Glossary: Behavior card |
| floor.new.title | Start a new check | Empezar un chequeo nuevo | Empezar una revisión nueva | Glossary: Floor check; feminine agreement |
| floor.new.hint | For anyone without this week's card: pick the rep and the behavior you will watch for. | Para quien no tenga tarjeta esta semana: escoja al vendedor y el comportamiento que va a observar. | Para quien no tenga meta esta semana: escoja al vendedor y el comportamiento que va a observar. | Glossary: Behavior card |
| floor.new.start | Start the check | Empezar el chequeo | Empezar la revisión | Glossary: Floor check |
| floor.new.exists | That rep already has this week's card; it is below. | Ese vendedor ya tiene la tarjeta de esta semana; está abajo. | Ese vendedor ya tiene la meta de esta semana; está abajo. | Glossary: Behavior card |
| floor.new.failed | Could not start the check. Try again. | No se pudo empezar el chequeo. Intente de nuevo. | No se pudo empezar la revisión. Intente de nuevo. | Glossary: Floor check |
| assign.list | Assignments | Asignaciones | Tareas asignadas | Glossary: Assignment |
| assign.due.short | Due {date} | Para el {date} | Vence el {date} | Glossary: Due (Vence el viernes) |
| assign.dueOn | Due {date} | Para el {date} | Vence el {date} | Glossary: Due |
| today.due | Due {date} | Para el {date} | Vence el {date} | Glossary: Due |
| debrief.title | Debrief | Resumen | Resumen de la sesión | Glossary: Debrief |
| debrief.tryAgain | Try again | Intentar de nuevo | Volver a intentar | Glossary: Try again (button) |
| card.title | Behavior card | Tarjeta de comportamiento | Meta de la semana | Glossary: Behavior card |
| today.noCard | Your first behavior card arrives after your first practice week. | Su primera tarjeta de comportamiento llega después de su primera semana de práctica. | Su primera meta llega después de su primera semana de práctica. | Glossary: Behavior card; 'meta de la semana' would repeat 'semana' |
| today.noAssignments | No assignments right now. | No tiene asignaciones por ahora. | No tiene tareas asignadas por ahora. | Glossary: Assignment |
| error.retry | Try again | Intentar de nuevo | Volver a intentar | Glossary: Try again (button) |
| debrief.stage.write | Writing your debrief and the one change that matters… | Escribiendo su resumen y el cambio que más importa… | Escribiendo el resumen de su sesión y el cambio que más importa… | Glossary: Debrief |
| team.card | This week's card | Tarjeta de la semana | Meta de la semana | Glossary: Behavior card |
| team.noCards | No cards issued this week yet. Cards appear after reps practice. | Todavía no hay tarjetas esta semana. Aparecen cuando los vendedores practican. | Todavía no hay metas esta semana. Aparecen cuando los vendedores practican. | Glossary: Behavior card |
| card.issued | Your card for this week | Su tarjeta de esta semana | Su meta de esta semana | Glossary: Behavior card |
| home.how sub | (role-play) | Sin compañero de role-play, sin salón de clases | Sin compañero para simular, sin salón de clases | Glossary: Roleplay → Simulación (confirm); as an adjective, 'simulados' |
| home.industries.sub | (role-play) | Los clientes de role-play llegan una industria a la vez. | Los clientes simulados llegan una industria a la vez. | Glossary: Roleplay → Simulación (confirm); as an adjective, 'simulados' |
| home.industries.subAll | (role-play) | Cada industria tiene sus propios clientes de role-play, | Cada industria tiene sus propios clientes simulados, | Glossary: Roleplay → Simulación (confirm); as an adjective, 'simulados' |
| home.industries.cars | (role-play) | {n} clientes de role-play, uno para cada objeción del piso." }, | {n} clientes simulados, uno para cada objeción del piso." }, | Glossary: Roleplay → Simulación (confirm); as an adjective, 'simulados' |
| home.industries.homes | (role-play) | {n} compradores de casa en role-play, | {n} compradores de casa simulados, | Glossary: Roleplay → Simulación (confirm); as an adjective, 'simulados' |
| home.industries.solar | (role-play) | {n} dueños de casa en role-play que están pensando en solar, | {n} dueños de casa simulados que están pensando en solar, | Glossary: Roleplay → Simulación (confirm); as an adjective, 'simulados' |
| home.industries.furniture | (role-play) | {n} clientes de mueblería en role-play, | {n} clientes de mueblería simulados, | Glossary: Roleplay → Simulación (confirm); as an adjective, 'simulados' |
| pricing.faq.industries | (role-play) | el grupo más completo de clientes de role-play, | el grupo más completo de clientes simulados, | Glossary: Roleplay → Simulación (confirm); as an adjective, 'simulados' |
