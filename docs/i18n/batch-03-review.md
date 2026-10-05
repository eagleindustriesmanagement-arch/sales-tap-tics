# Spanish batch 3, part 1: navigation and buttons (for review, not merged)

Style guide rule (docs/spanish-style-guide.md, section 3.3): buttons are a short infinitive ("Guardar", "Empezar
práctica"); the glossary names the demonstration button "Ver ejemplo". Every button and link label in the app was
checked; these eight change. All other labels already follow the rule.

| Key | English | Old Spanish | New Spanish | Reason |
| --- | --- | --- | --- | --- |
| lesson.seeIt | See it done | Véalo hecho | Ver ejemplo | Button: infinitive; glossary term for the demonstration |
| scenario.watchDemo | Watch demo | Ver demostración | Ver ejemplo | Glossary: "Ver ejemplo" for the button; one name for one thing |
| login.sendCode | Send me a code | Envíeme un código | Recibir un código | Button: infinitive |
| signup.send | Email me a code | Envíeme un código | Recibir un código | Button: infinitive |
| login.startPilot | Get started | Empiece ya | Empezar | Button: infinitive |
| settings.push.turnOff | Turn off | Apagar | Desactivar | Pairs with "Activar" beside it |
| practice.resume | Pick it back up | Retomarla | Retomar la conversación | A bare "-la" on a button has nothing to point to |
| voice.tapToHear | Tap to hear {name} | Toque para oír a {name} | Oír a {name} | Button: infinitive |

Kept on purpose:

- **"Iniciar sesión"** (the sign-in title). The approved glossary (section 4.1) names Sign in "Iniciar sesión"; an
  earlier draft of this batch changed it to "Entrar", against the glossary, and was corrected before review.

- **"Toque aquí para hablar" and "Toque para hablar"** (iPhone tap to talk). The owner asked for the button itself
  to say plainly that you tap it to talk (October 4); an infinitive ("Hablar") would lose that.
- **"Entiendo y acepto"** (consent). A consent button states agreement in the first person, by convention.

All changed lines stay `spanish_reviewed: false` until a Miami reviewer approves them.
