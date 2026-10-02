import type { Bilingual } from "./types.js";

/**
 * Every customer-facing UI string, both languages side by side so they cannot drift (spec 16.1 rule 1).
 * The type forces both sides at compile time; `scripts/check.ts` also fails CI on empty strings.
 * Spanish is written for Miami in the usted register and still needs native review (spec 16.3).
 * Placeholders use {name} and are filled by `t()`.
 */
export const STRINGS = {
  "app.name": { en: "Sales Tap-tics", es: "Sales Tap-tics" },
  "app.disclaimer": {
    en: "This is a training tool, not legal advice. Compliance rules must be confirmed by your dealership's attorney.",
    es: "Esta es una herramienta de entrenamiento, no asesoría legal. Las reglas de cumplimiento deben ser confirmadas por el abogado del concesionario.",
  },

  "consent.title": { en: "Before you start", es: "Antes de empezar" },
  "consent.body": {
    en: "Your practice sessions are recorded and transcribed for training. You and, after your private window of {hours} hours, your managers can see them. Audio is kept for {days} days. Recordings are never used to train AI models.",
    es: "Sus sesiones de práctica se graban y se transcriben para entrenamiento. Usted y, después de su ventana privada de {hours} horas, sus gerentes las pueden ver. El audio se guarda por {days} días. Las grabaciones nunca se usan para entrenar modelos de inteligencia artificial.",
  },
  "consent.accept": { en: "I understand and agree", es: "Entiendo y acepto" },

  "nav.today": { en: "Today", es: "Hoy" },
  "nav.library": { en: "Library", es: "Biblioteca" },
  "nav.history": { en: "History", es: "Historial" },
  "nav.progress": { en: "Progress", es: "Progreso" },
  "nav.settings": { en: "Settings", es: "Configuración" },
  "nav.floor": { en: "Floor mode", es: "Modo piso" },
  "nav.team": { en: "Team", es: "Equipo" },
  "nav.compliance": { en: "Compliance", es: "Cumplimiento" },

  "today.practiceNow": { en: "Practice now", es: "Practicar ahora" },
  "today.whyPicked": { en: "Why this one: {reason}", es: "Por qué este: {reason}" },
  "today.behaviorCard": { en: "This week's behavior", es: "El comportamiento de esta semana" },
  "today.assignments": { en: "From your manager", es: "De su gerente" },
  "today.due": { en: "Due {date}", es: "Para el {date}" },

  "scenario.setting": { en: "Setting", es: "Lugar" },
  "scenario.targets": { en: "Techniques to use", es: "Técnicas a usar" },
  "scenario.evidence": { en: "Evidence grade {grade}", es: "Nivel de evidencia {grade}" },
  "scenario.language": { en: "Session language", es: "Idioma de la sesión" },
  "scenario.language.en": { en: "English", es: "Inglés" },
  "scenario.language.es": { en: "Spanish", es: "Español" },
  "scenario.language.follow": { en: "Follow the customer", es: "Seguir al cliente" },
  "scenario.watchDemo": { en: "Watch demo", es: "Ver demostración" },
  "scenario.start": { en: "Start", es: "Empezar" },
  "scenario.skipDemo": { en: "Skip demo", es: "Saltar demostración" },

  "demo.flawed": { en: "What not to do", es: "Lo que no se debe hacer" },
  "demo.good": { en: "The model", es: "El modelo" },

  "practice.end": { en: "End session", es: "Terminar sesión" },
  "practice.showSheet": { en: "Show sheet", es: "Mostrar hoja" },
  "practice.sheetTitle": { en: "Numbers sheet", es: "Hoja de números" },
  "practice.listening": { en: "Listening…", es: "Escuchando…" },
  "practice.customerSpeaking": { en: "Customer is speaking", es: "El cliente está hablando" },
  "practice.typeHere": { en: "Type what you would say", es: "Escriba lo que diría" },
  "practice.send": { en: "Send", es: "Enviar" },
  "practice.textModeNotice": {
    en: "Text mode: pause, pace and volume are not scored in this session.",
    es: "Modo texto: la pausa, el ritmo y el volumen no se califican en esta sesión.",
  },
  "practice.micDenied": {
    en: "We cannot hear your microphone. Allow microphone access in your browser settings, then reload. You can also practice by typing.",
    es: "No podemos escuchar su micrófono. Permita el acceso al micrófono en la configuración del navegador y vuelva a cargar. También puede practicar escribiendo.",
  },
  "practice.tooNoisy": {
    en: "It is too noisy for a clean recording. Move somewhere quieter or use a headset.",
    es: "Hay demasiado ruido para una buena grabación. Muévase a un lugar más tranquilo o use audífonos.",
  },
  "practice.offline": {
    en: "Practice needs a connection. The library and demos still work offline.",
    es: "Para practicar necesita conexión. La biblioteca y las demostraciones funcionan sin conexión.",
  },
  "practice.reconnecting": { en: "Reconnecting…", es: "Reconectando…" },

  "debrief.title": { en: "Debrief", es: "Resumen" },
  "debrief.critical": { en: "Compliance issue", es: "Problema de cumplimiento" },
  "debrief.trueFact": { en: "The true fact", es: "El dato real" },
  "debrief.compliantLine": { en: "Say this instead", es: "Diga esto en su lugar" },
  "debrief.score": { en: "Score", es: "Puntaje" },
  "debrief.passed": { en: "Passed", es: "Aprobado" },
  "debrief.notPassed": { en: "Not passed yet", es: "Todavía no aprobado" },
  "debrief.worked": { en: "What worked", es: "Lo que funcionó" },
  "debrief.change": { en: "The one change that matters most", es: "El cambio que más importa" },
  "debrief.why": { en: "Why it matters", es: "Por qué importa" },
  "debrief.turningPoint": { en: "The turning point", es: "El momento clave" },
  "debrief.youSaid": { en: "You said", es: "Usted dijo" },
  "debrief.tryInstead": { en: "Try instead", es: "Pruebe en su lugar" },
  "debrief.tryAgain": { en: "Try again", es: "Intentar de nuevo" },
  "debrief.notScored": {
    en: "Not scored: the recording was unclear at this moment.",
    es: "Sin calificar: la grabación no se entendió bien en este momento.",
  },
  "debrief.hiddenTruth": { en: "What the customer was really thinking", es: "Lo que el cliente de verdad pensaba" },

  "endReason.sale": { en: "Bought", es: "Compró" },
  "endReason.next_step": { en: "Booked a next step", es: "Acordó un próximo paso" },
  "endReason.walk_away": { en: "Walked away", es: "Se fue" },
  "endReason.not_now": { en: "Not now", es: "Hoy no" },
  "endReason.timeout": { en: "Time ran out", es: "Se acabó el tiempo" },
  "endReason.abandoned": { en: "Ended early", es: "Terminada antes de tiempo" },

  "dimension.composure": { en: "Composure", es: "Serenidad" },
  "dimension.discovery": { en: "Discovery", es: "Descubrimiento" },
  "dimension.technique": { en: "Technique", es: "Técnica" },
  "dimension.honesty": { en: "Honesty", es: "Honestidad" },
  "dimension.outcome": { en: "Outcome", es: "Resultado" },

  "card.title": { en: "Behavior card", es: "Tarjeta de comportamiento" },
  "card.checkWhen": { en: "Your manager will check this by {date}", es: "Su gerente lo va a revisar antes del {date}" },
  "card.managerNote": { en: "Your manager's note", es: "La nota de su gerente" },

  "floor.title": { en: "This week's floor checks", es: "Revisiones en piso de esta semana" },
  "floor.script": { en: "Script", es: "Guion" },
  "floor.observed": { en: "Did you see it?", es: "¿Lo vio?" },
  "floor.observed.yes": { en: "Yes", es: "Sí" },
  "floor.observed.partly": { en: "Partly", es: "En parte" },
  "floor.observed.no": { en: "No", es: "No" },
  "floor.note": { en: "One-line note (optional)", es: "Nota de una línea (opcional)" },
  "floor.selfCheck.specific": { en: "I named one specific behavior", es: "Nombré un comportamiento específico" },
  "floor.selfCheck.modeled": { en: "I modeled the line in person", es: "Modelé la frase en persona" },
  "floor.save": { en: "Record check", es: "Registrar revisión" },

  "evidence.A": { en: "Law, regulator, binding decree or meta-analysis", es: "Ley, regulador, decreto vinculante o metaanálisis" },
  "evidence.B": { en: "Single peer-reviewed study or large dataset", es: "Un estudio revisado por pares o un conjunto grande de datos" },
  "evidence.C": { en: "Preprint, credible secondary source or industry survey", es: "Prepublicación, fuente secundaria confiable o encuesta de la industria" },
  "evidence.D": { en: "Practitioner tradition or vendor claim", es: "Tradición de vendedores o afirmación de un proveedor" },
} as const satisfies Record<string, Bilingual>;

export type StringKey = keyof typeof STRINGS;
