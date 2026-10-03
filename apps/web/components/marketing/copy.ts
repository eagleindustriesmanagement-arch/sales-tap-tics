import type { Language } from "@taptics/i18n";

/**
 * Every line on the public home page, English and Miami Spanish side by side (usted, the floor's loanwords).
 * Truth rule: only claims the product makes good on. No statistics, names, logos, testimonials or prices.
 * Numbers inside the mock screens are sample data and are labelled that way on the page.
 */
export interface L { en: string; es: string }

export const say = (line: L, lang: Language) => line[lang];

export const copy = {
  nav: {
    home: { en: "Sales Taptics home", es: "Inicio de Sales Taptics" },
    label: { en: "Sections", es: "Secciones" },
    how: { en: "How it works", es: "Cómo funciona" },
    library: { en: "Objections", es: "Objeciones" },
    scoring: { en: "Scoring", es: "Calificación" },
    managers: { en: "Managers", es: "Gerentes" },
    pilot: { en: "Pilot", es: "Piloto" },
    menu: { en: "Menu", es: "Menú" },
    signIn: { en: "Sign in", es: "Entrar" },
    startPilot: { en: "Start a pilot", es: "Empezar un piloto" },
    tryDemo: { en: "Try the demo", es: "Probar el demo" },
  },

  hero: {
    eyebrow: { en: "Role-play for the car sales floor", es: "Role-play para el piso de ventas" },
    h1a: { en: "Your reps take the hard ups", es: "Sus vendedores atienden los ups difíciles" },
    h1b: { en: "here first.", es: "aquí primero." },
    sub: {
      en: "An AI customer who says “I need to talk to my wife” and means the payment. Your reps dig out the real reason, out loud or typed, in English or Miami Spanish. Every line gets scored and checked against the deal before it ever reaches a real customer.",
      es: "Un cliente de inteligencia artificial que dice “lo tengo que hablar con mi esposa” y lo que le preocupa es el pago. Sus vendedores sacan la razón de verdad, hablando o escribiendo, en inglés o en español de Miami. Cada frase se califica y se compara con el deal antes de llegarle a un cliente de verdad.",
    },
    facts: [
      { en: "65 objections", es: "65 objeciones" },
      { en: "English + Miami Spanish", es: "Inglés + español de Miami" },
      { en: "Talk or type", es: "Hablando o escribiendo" },
      { en: "Every line compliance-checked", es: "Cumplimiento revisado en cada frase" },
    ],
  },

  /** The phone in the hero: the practice room, mid-conversation. Decorative (aria-hidden). */
  phone: {
    title: { en: "Practice · Level 1", es: "Práctica · Nivel 1" },
    customer: { en: "Customer", es: "Cliente" },
    you: { en: "You", es: "Usted" },
    c1: { en: "I like it. But I need to talk to my wife.", es: "Me gusta. Pero lo tengo que hablar con mi esposa." },
    r1: { en: "Makes sense. What do you think she'll ask about first?", es: "Claro que sí. ¿Qué cree que ella le va a preguntar primero?" },
    c2: { en: "Honestly? The payment. We got burned on the last one.", es: "La verdad, el pago. Con el carro anterior nos fue mal con eso." },
    unlocked: { en: "Hidden reason found", es: "Razón escondida encontrada" },
    r2: { en: "Then let's go over it with her. Saturday at 11, both of you?", es: "Entonces lo vemos con ella. ¿El sábado a las 11, los dos?" },
    composer: { en: "Your turn…", es: "Su turno…" },
    turns: { en: "Turns left", es: "Turnos" },
  },

  /** The cards that float around the phone. Decorative (aria-hidden). */
  float: {
    objection: { en: "Objection", es: "Objeción" },
    objLine: { en: "“Your price is too high.”", es: "“El precio está muy alto.”" },
    repLine: { en: "“Too high compared to what?”", es: "“¿Alto comparado con qué?”" },
    score: { en: "Score", es: "Puntaje" },
    oneChange: { en: "One change", es: "Un cambio" },
    oneChangeLine: { en: "Ask before you answer.", es: "Pregunte antes de contestar." },
    critical: { en: "Critical", es: "Crítico" },
    flagLine: { en: "“This price is only good today.”", es: "“Este precio es solo por hoy.”" },
    flagWhy: { en: "Made-up deadline. Session stopped.", es: "Fecha límite inventada. Sesión detenida." },
  },

  how: {
    eyebrow: { en: "How it works", es: "Cómo funciona" },
    h2: { en: "No role-play partner. No waiting for a slow Tuesday.", es: "Sin compañero de role-play. Sin esperar un martes flojo." },
    sub: { en: "A rep picks an objection, takes the up, and gets the debrief on the spot.", es: "El vendedor escoge una objeción, atiende el up y recibe el resultado al momento." },
    steps: [
      {
        title: { en: "Practice the call", es: "Practique la conversación" },
        body: {
          en: "The customer talks back, and there's a reason behind every objection. Say it out loud or type it. Want to see it done first? Watch a flawed demo and a good one.",
          es: "El cliente le contesta, y detrás de cada objeción hay una razón. Dígalo en voz alta o escríbalo. ¿Lo quiere ver primero? Vea un demo mal hecho y uno bien hecho.",
        },
      },
      {
        title: { en: "Get scored", es: "Reciba su puntaje" },
        body: {
          en: "Scored on what you actually said, line by line. The critical issue comes first, then the one change that matters most, and why.",
          es: "Se califica lo que usted dijo de verdad, frase por frase. Primero el problema crítico, después el cambio que más importa, y por qué.",
        },
      },
      {
        title: { en: "Get certified", es: "Certifíquese" },
        body: {
          en: "Pass the certification path before taking customers alone. It's good for 90 days. Then you prove it again.",
          es: "Apruebe la ruta de certificación antes de atender clientes solo. Vale por 90 días. Después se demuestra otra vez.",
        },
      },
    ],
  },

  library: {
    eyebrow: { en: "The objection library", es: "La biblioteca de objeciones" },
    h2: { en: "{n} objections. A customer for every one.", es: "{n} objeciones. Un cliente para cada una." },
    sub: {
      en: "The ones you hear every Saturday. On the phone, at the desk, on the trade, on electric. Each one is a customer with a story, a deal on the table, and a reason they won't tell you first.",
      es: "Las que se oyen todos los sábados. Por teléfono, en el desk, con el trade-in, con los eléctricos. Cada una es un cliente con su historia, un deal sobre la mesa y una razón que no le dice de entrada.",
    },
    level: { en: "Level", es: "Nivel" },
    phone: { en: "Phone", es: "Teléfono" },
    pause: { en: "Pause the list", es: "Pausar la lista" },
    play: { en: "Play the list", es: "Mover la lista" },
    note: { en: "Every customer, in English and in Spanish.", es: "Cada cliente, en inglés y en español." },
  },

  scoring: {
    eyebrow: { en: "Scoring and compliance", es: "Calificación y cumplimiento" },
    h2a: { en: "Scored on what closes.", es: "Se califica lo que cierra." },
    h2b: { en: "Stopped on what can't be said.", es: "Se para lo que no se puede decir." },
    scoredTitle: { en: "What gets scored", es: "Lo que se califica" },
    scored: [
      {
        title: { en: "The question before the solution", es: "La pregunta antes de la solución" },
        body: { en: "After an objection, ask first. Jumping straight to the pitch gets marked.", es: "Después de una objeción, primero se pregunta. Saltar directo a vender se marca." },
      },
      {
        title: { en: "The real reason, uncovered", es: "La razón de verdad, descubierta" },
        body: { en: "“Talk to my wife” can be the wife. Or it can be the payment. Find out which.", es: "“Lo tengo que hablar con mi esposa” puede ser la esposa. O puede ser el pago. Averigüe cuál es." },
      },
      {
        title: { en: "A next step with a day and a time", es: "Un próximo paso con día y hora" },
        body: { en: "“I'll call you” isn't a next step. “Saturday at 11, both of you” is.", es: "“Yo lo llamo” no es un próximo paso. “El sábado a las 11, los dos” sí lo es." },
      },
      {
        title: { en: "Pauses and pace, in voice mode", es: "Pausas y ritmo, hablando" },
        body: { en: "Take a breath before you answer an objection. Don't speed up when it gets hard.", es: "Respire antes de contestar una objeción. No se acelere cuando se pone difícil." },
      },
    ],
    engineTitle: { en: "The compliance engine", es: "El motor de cumplimiento" },
    engineBody: {
      en: "Every rep line is checked against the deal's real facts and the strictest reading of Florida and FTC rules. Hardball is fine. Lying about the facts isn't.",
      es: "Cada frase del vendedor se compara con los datos reales del deal y con la lectura más estricta de las reglas de Florida y de la FTC. Apretar está bien. Mentir sobre los datos, no.",
    },
    rules: [
      { en: "No made-up deadlines", es: "Nada de fechas límite inventadas" },
      { en: "No “last one on the lot” unless it is", es: "Nada de “es el último” si no lo es" },
      { en: "No price that isn't the all-in price", es: "Ningún precio que no sea el precio total" },
      { en: "No rate or approval the bank never gave", es: "Ninguna tasa ni aprobación que el banco no dio" },
    ],
    stop: {
      en: "A critical violation stops the session cold. Always in certification. In practice, your call.",
      es: "Una violación crítica para la sesión en seco. Siempre en la certificación. En la práctica, usted decide.",
    },
    flagged: { en: "Flagged line", es: "Frase marcada" },
    flagMeta: { en: "Rep · turn 6", es: "Vendedor · turno 6" },
    flagLine: { en: "This price is only good today.", es: "Este precio es solo por hoy." },
    flagHit: { en: "only good today", es: "solo por hoy" },
    flagFactLabel: { en: "The deal's facts", es: "Los datos del deal" },
    flagRule: { en: "Made-up deadline", es: "Fecha límite inventada" },
    flagSeverity: { en: "Critical", es: "Crítica" },
    flagFact: { en: "This deal has no deadline.", es: "Este deal no tiene fecha límite." },
    flagStopped: { en: "Session stopped", es: "Sesión detenida" },
  },

  managers: {
    eyebrow: { en: "For managers", es: "Para gerentes" },
    h2: { en: "A floor check in under a minute.", es: "Un chequeo en el piso en menos de un minuto." },
    sub: {
      en: "Each rep gets one behavior to work on this week. You watch for it on the floor, score the check on four parts, and get back to the desk.",
      es: "Cada vendedor tiene un comportamiento que trabajar esta semana. Usted lo observa en el piso, califica el chequeo en cuatro partes y vuelve al desk.",
    },
    features: [
      { en: "Team view: who practiced, their scores, any critical flags", es: "Vista del equipo: quién practicó, sus puntajes y las banderas críticas" },
      { en: "Assign a customer to a rep, with a due date and a reason", es: "Asígnele un cliente a un vendedor, con fecha de entrega y una razón" },
      { en: "The GM gets the store dashboard: certified reps, practice, floor checks", es: "El gerente general tiene el panel de la tienda: certificados, práctica, chequeos" },
    ],
    mockTitle: { en: "Floor mode", es: "Modo piso" },
    week: { en: "This week", es: "Esta semana" },
    focusLabel: { en: "Behavior focus", es: "Comportamiento de la semana" },
    focus: { en: "Ask before you answer", es: "Pregunte antes de contestar" },
    team: { en: "Team", es: "Equipo" },
    certified: { en: "Certified", es: "Certificado" },
    practicing: { en: "Practicing", es: "Practicando" },
    check: { en: "Floor check", es: "Chequeo en el piso" },
    sample: { en: "Illustration with sample data.", es: "Ilustración con datos de muestra." },
  },

  bilingual: {
    eyebrow: { en: "English and Miami Spanish", es: "Inglés y español de Miami" },
    h2: { en: "It talks the way Miami buyers talk.", es: "Habla como habla el cliente de Miami." },
    body: {
      en: "Usted. El down. El trade-in. El dealer. The AI customer sounds like the people who walk onto your lot. Your rep practices in either language and gets scored on following the customer's lead.",
      es: "Usted. El down. El trade-in. El dealer. El cliente suena como la gente que llega a su lote. Su vendedor practica en cualquiera de los dos idiomas y se le califica por seguir al cliente.",
    },
    words: { en: "Words from the floor", es: "Palabras del piso" },
    customer: { en: "Customer", es: "Cliente" },
    rep: { en: "Rep", es: "Vendedor" },
    inEnglish: { en: "In English", es: "En inglés" },
    spanish: { en: "Spanish", es: "Español" },
    /** The snippet itself is Spanish in both page languages; `gloss` is its English. */
    c: "Mire, el trade-in mío vale algo, ¿no? Porque de down no tengo mucho.",
    cGloss: "Look, my trade-in's worth something, right? Because I don't have much down.",
    r: "Claro que sí. Vamos a ver su trade-in primero. ¿Cuánto debe todavía?",
    rGloss: "Of course. Let's look at your trade first. How much do you still owe on it?",
  },

  pilot: {
    eyebrow: { en: "Pilot", es: "Piloto" },
    h2: { en: "Put it on your floor.", es: "Póngalo en su piso." },
    sub: { en: "A pilot is your store, set up the way you sell.", es: "Un piloto es su tienda, configurada como usted vende." },
    items: [
      { en: "Your store and your reps, invited by email or phone", es: "Su tienda y sus vendedores, invitados por email o por teléfono" },
      { en: "Your dealer fees and lenders configured, so practice deals carry your real numbers", es: "Sus cargos del dealer y sus bancos configurados, para que la práctica use sus números reales" },
      { en: "Managers see the floor from day one: floor mode and the team view", es: "Los gerentes ven el piso desde el primer día: modo piso y vista del equipo" },
      { en: "Your compliance reviewer signs off on the store setup", es: "Su encargado de cumplimiento aprueba la configuración de la tienda" },
    ],
    demoNote: { en: "Want to see it first? The demo opens with sample logins. Nothing to set up.", es: "¿Lo quiere ver primero? El demo abre con usuarios de muestra. No hay nada que configurar." },
  },

  footer: {
    rights: { en: "© 2026 Sales Taptics", es: "© 2026 Sales Taptics" },
    links: { en: "Links", es: "Enlaces" },
  },
} as const;
