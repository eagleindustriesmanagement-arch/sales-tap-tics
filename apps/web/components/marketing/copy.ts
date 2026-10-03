import type { Language } from "@taptics/i18n";

/**
 * Every line on the public home page, English and Miami Spanish side by side (usted, the floor's loanwords).
 * Truth rule: only claims the product makes good on, and only research we can cite (docs/research/
 * selling-sales-training.md). No invented statistics, names, logos, testimonials, awards or user counts. The two
 * research figures are printed with their attribution, never as a result of using Sales Taptics. Numbers inside
 * the mock screens are sample data and are labelled that way on the page. Counts ({n}) come from the content
 * library at render time.
 */
export interface L { en: string; es: string }

export const say = (line: L, lang: Language) => line[lang];
/** Fills {name} slots in a line. */
export const fill = (line: string, values: Record<string, string | number>) =>
  line.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));

export const copy = {
  nav: {
    home: { en: "Sales Taptics home", es: "Inicio de Sales Taptics" },
    label: { en: "Sections", es: "Secciones" },
    how: { en: "How it works", es: "Cómo funciona" },
    techniques: { en: "Techniques", es: "Técnicas" },
    results: { en: "Results", es: "Resultados" },
    managers: { en: "Managers", es: "Gerentes" },
    pricing: { en: "Pricing", es: "Precios" },
    menu: { en: "Menu", es: "Menú" },
    signIn: { en: "Sign in", es: "Entrar" },
    startFree: { en: "Start free", es: "Empiece gratis" },
    tryDemo: { en: "Try the demo", es: "Probar el demo" },
  },

  hero: {
    eyebrow: { en: "Simple to use. Deep to learn.", es: "Fácil de usar. Profundo para aprender." },
    h1a: { en: "Master the close", es: "Domine el cierre" },
    h1b: { en: "before it counts.", es: "antes de que cuente." },
    sub: {
      en: "Sales training for people who sell: cars, homes, solar, furniture. Learn a proven technique in about a minute, practice it out loud against an AI customer, and get scored on every line.",
      es: "Entrenamiento de ventas para la gente que vende: carros, casas, paneles solares, muebles. Aprenda una técnica probada en más o menos un minuto, practíquela en voz alta con un cliente de inteligencia artificial y reciba un puntaje en cada frase.",
    },
    ways: {
      en: "Sign up your whole team, or just yourself. No credit card.",
      es: "Inscriba a todo su equipo, o solo a usted. Sin tarjeta de crédito.",
    },
    facts: {
      techniques: { en: "{n} techniques", es: "{n} técnicas" },
      lessons: { en: "{n} guided lessons", es: "{n} lecciones guiadas" },
      languages: { en: "English + Spanish", es: "Inglés + español" },
      talk: { en: "Talk or type", es: "Hablando o escribiendo" },
    },
  },

  /** The phone in the hero: the practice room, mid-conversation. Decorative (aria-hidden). */
  phone: {
    title: { en: "Practice · Level 1", es: "Práctica · Nivel 1" },
    customer: { en: "Customer", es: "Cliente" },
    you: { en: "You", es: "Usted" },
    c1: { en: "I like it. But I need to talk to my wife.", es: "Me gusta. Pero lo tengo que hablar con mi esposa." },
    r1: { en: "Makes sense. What do you think she'll ask about first?", es: "Claro que sí. ¿Qué cree que ella le va a preguntar primero?" },
    c2: { en: "Honestly? The payment. We got burned on the last one.", es: "La verdad, el pago. Con el anterior nos fue mal con eso." },
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

  /**
   * Right under the hero: where the techniques come from. Phrasing from the research doc, section 2. Not "every
   * technique traces to published research": the library grades its own evidence, and some techniques are
   * labelled floor tradition (see techniques.evidence).
   */
  research: {
    label: { en: "The research behind it", es: "La investigación detrás" },
    line: {
      en: "Built on published research, from Neil Rackham's 35,000 observed sales calls to studies of millions of recorded sales conversations.",
      es: "Basado en investigación publicada, desde las 35,000 llamadas de venta que observó Neil Rackham hasta estudios de millones de conversaciones de venta grabadas.",
    },
    bodies: [
      { en: "Rackham's SPIN research", es: "La investigación SPIN de Rackham" },
      { en: "Gong Labs studies", es: "Los estudios de Gong Labs" },
      { en: "The JOLT Effect", es: "The JOLT Effect" },
      { en: "Negotiation research", es: "Investigación de negociación" },
    ],
  },

  roi: {
    eyebrow: { en: "Why train", es: "Por qué entrenar" },
    figure: { en: "12%", es: "12%" },
    figureLabel: { en: "more sales per day", es: "más ventas por día" },
    h2: { en: "Trained sales floors sold 12% more per day.", es: "Los pisos de venta entrenados vendieron 12% más por día." },
    cite: {
      en: "Stores where both sales associates and managers were trained saw daily sales rise 12.1% vs. randomly selected untrained stores. Prada, Rucci & Urzúa, randomized field experiment at a large retailer, IDB / IZA Discussion Paper 12447 (2019).",
      es: "Las tiendas donde se entrenó a los vendedores y también a los gerentes vieron subir sus ventas diarias 12.1% frente a tiendas sin entrenamiento escogidas al azar. Prada, Rucci y Urzúa, experimento de campo aleatorizado en una gran cadena de tiendas, BID / IZA Discussion Paper 12447 (2019).",
    },
    caveat: {
      en: "The training in that study covered communication and leadership skills. It was not Sales Taptics, and results vary.",
      es: "El entrenamiento de ese estudio fue en comunicación y liderazgo. No fue Sales Taptics, y los resultados varían.",
    },
    bridge: {
      en: "Training only pays when people actually practice. Sales Taptics makes practice and coaching a few minutes a day, on the phone your people already carry.",
      es: "El entrenamiento solo rinde cuando la gente practica de verdad. Sales Taptics convierte la práctica y el coaching en unos minutos al día, en el teléfono que su gente ya carga.",
    },
    coachFigure: { en: "Up to 19%", es: "Hasta 19%" },
    coachHead: { en: "better against goal with great coaching", es: "mejor frente a la meta con un buen coaching" },
    coachLine: {
      en: "Reps in the middle 60% who got the best coaching performed up to 19% better against goal than those who got the worst.",
      es: "Los vendedores del 60% del medio que recibieron el mejor coaching rindieron hasta 19% mejor frente a la meta que los que recibieron el peor.",
    },
    coachCite: {
      en: "Dixon & Adamson, CEB Sales Executive Council, Harvard Business Review, 2011.",
      es: "Dixon y Adamson, CEB Sales Executive Council, Harvard Business Review, 2011.",
    },
    calc: {
      title: { en: "What 12% means for you", es: "Lo que 12% significa para usted" },
      label: { en: "Your monthly sales, in dollars", es: "Sus ventas mensuales, en dólares" },
      result: { en: "12.1% of that is", es: "El 12.1% de eso es" },
      perMonth: { en: "a month", es: "al mes" },
      perYear: { en: "{x} a year", es: "{x} al año" },
      note: {
        en: "An illustration: the lift measured in the study above, applied to your number. Not a promise. Your results depend on your people, your market and how you train.",
        es: "Una ilustración: el aumento que midió el estudio de arriba, aplicado a su número. No es una promesa. Sus resultados dependen de su gente, su mercado y cómo entrena.",
      },
    },
  },

  how: {
    eyebrow: { en: "How it works", es: "Cómo funciona" },
    h2a: { en: "Simple to use.", es: "Fácil de usar." },
    h2b: { en: "Four steps, nothing to set up.", es: "Cuatro pasos, nada que configurar." },
    sub: {
      en: "No role-play partner, no classroom, no waiting for a slow Tuesday. Open it between customers.",
      es: "Sin compañero de role-play, sin salón de clases, sin esperar un martes flojo. Ábralo entre cliente y cliente.",
    },
    steps: [
      {
        title: { en: "Sign up", es: "Inscríbase" },
        body: {
          en: "As a manager, then send your people an invite link. Or on your own, just you.",
          es: "Como gerente, y después mándele a su gente un enlace de invitación. O por su cuenta, solo usted.",
        },
      },
      {
        title: { en: "Learn the tactic", es: "Aprenda la táctica" },
        body: {
          en: "A 60 to 90 second lesson: what to do, why it works, the exact words, the mistakes. Then watch it done well and done badly.",
          es: "Una lección de 60 a 90 segundos: qué hacer, por qué funciona, las palabras exactas, los errores. Después véalo bien hecho y mal hecho.",
        },
      },
      {
        title: { en: "Practice against the AI customer", es: "Practique con el cliente de IA" },
        body: {
          en: "The customer talks back and hides a real reason behind the objection. Say it out loud or type it.",
          es: "El cliente le contesta y esconde una razón de verdad detrás de la objeción. Dígalo en voz alta o escríbalo.",
        },
      },
      {
        title: { en: "Get scored and certified", es: "Reciba su puntaje y certifíquese" },
        body: {
          en: "Every line scored, with the one change that matters most. Pass the path to get certified, good for 90 days.",
          es: "Cada frase con puntaje, y el cambio que más importa. Apruebe la ruta para certificarse, por 90 días.",
        },
      },
    ],
  },

  techniques: {
    eyebrow: { en: "The technique library", es: "La biblioteca de técnicas" },
    h2a: { en: "Deep to learn.", es: "Profundo para aprender." },
    h2b: { en: "{n} techniques in {f} families.", es: "{n} técnicas en {f} familias." },
    sub: {
      en: "From the two-second pause to the firm next step. Each one has the moment to use it, the words to say, the mistake to avoid and its evidence grade, so you know what is proven and what is floor wisdom.",
      es: "Desde la pausa de dos segundos hasta el próximo paso firme. Cada una trae el momento de usarla, las palabras que se dicen, el error que se evita y su nivel de evidencia, para que sepa qué está probado y qué es sabiduría del piso.",
    },
    featuredLabel: { en: "A few to start with", es: "Algunas para empezar" },
    when: { en: "When", es: "Cuándo" },
    familiesLabel: { en: "Techniques by family", es: "Técnicas por familia" },
    evidence: {
      en: "{n} are backed by the law, a meta-analysis, a peer-reviewed study or a large dataset. The rest say so when they come from floor tradition.",
      es: "{n} están respaldadas por la ley, un metaanálisis, un estudio revisado por pares o un conjunto grande de datos. Las demás dicen claramente cuando vienen de la tradición del piso.",
    },
    lessons: {
      en: "{n} guided lessons walk you through them: learn the tactic, see it, do it, get scored.",
      es: "{n} lecciones guiadas lo llevan paso a paso: aprenda la táctica, véala, hágala y reciba su puntaje.",
    },
    pause: { en: "Pause the list", es: "Pausar la lista" },
    play: { en: "Play the list", es: "Mover la lista" },
    railLabel: { en: "More techniques from the library", es: "Más técnicas de la biblioteca" },
    families: {
      objection_sequence: { en: "Handling objections", es: "Manejo de objeciones" },
      discovery: { en: "Discovery", es: "Descubrimiento" },
      closing: { en: "Closing", es: "Cierre" },
      negotiation: { en: "Negotiation and price", es: "Negociación y precio" },
      indecision: { en: "Indecision", es: "Indecisión" },
      phone: { en: "Phone", es: "Teléfono" },
      finance_handoff: { en: "Finance handoff", es: "Paso a financiamiento" },
      delivery: { en: "Delivery", es: "Entrega" },
      follow_up: { en: "Follow-up and referrals", es: "Seguimiento y referidos" },
      language_trust: { en: "Language and trust", es: "Idioma y confianza" },
      ev: { en: "Electric vehicles", es: "Vehículos eléctricos" },
      compliance: { en: "Compliance", es: "Cumplimiento" },
    } as Record<string, L>,
  },

  industries: {
    eyebrow: { en: "Every close", es: "Cada cierre" },
    h2: { en: "Techniques for every close.", es: "Técnicas para cada cierre." },
    sub: {
      en: "Pausing before you answer, finding the real objection, putting the whole price on the table, asking for a firm next step: that works wherever a customer makes a big decision. The role-play customers come one industry at a time. We built them on the car floor first. Homes, solar and furniture are next.",
      es: "Hacer una pausa antes de contestar, encontrar la objeción de verdad, poner el precio completo sobre la mesa, pedir un próximo paso firme: eso funciona dondequiera que un cliente toma una decisión grande. Los clientes de role-play llegan una industria a la vez. Los construimos primero en el piso de carros. Casas, solar y muebles vienen después.",
    },
    /** Used once every industry on the page has role-play customers. */
    subAll: {
      en: "Pausing before you answer, finding the real objection, putting the whole price on the table, asking for a firm next step: that works wherever a customer makes a big decision. Each industry has role-play customers of its own, with the objections that floor really hears.",
      es: "Hacer una pausa antes de contestar, encontrar la objeción de verdad, poner el precio completo sobre la mesa, pedir un próximo paso firme: eso funciona dondequiera que un cliente toma una decisión grande. Cada industria tiene sus propios clientes de role-play, con las objeciones que de verdad se oyen en ese piso.",
    },
    live: { en: "Customers live", es: "Clientes listos" },
    next: { en: "Customers next", es: "Clientes en camino" },
    items: [
      {
        key: "cars",
        name: { en: "Cars", es: "Carros" },
        body: { en: "{n} role-play customers, one for every objection on the floor.", es: "{n} clientes de role-play, uno para cada objeción del piso." },
        liveBody: { en: "{n} role-play customers, one for every objection on the floor.", es: "{n} clientes de role-play, uno para cada objeción del piso." },
      },
      {
        key: "homes",
        name: { en: "Homes", es: "Casas" },
        body: { en: "The techniques work today. Home-buyer customers are next.", es: "Las técnicas funcionan hoy. Los clientes que compran casa vienen después." },
        liveBody: { en: "{n} role-play home buyers, from the first-timer to the family moving up.", es: "{n} compradores de casa en role-play, desde el que compra por primera vez hasta la familia que sube de casa." },
      },
      {
        key: "solar",
        name: { en: "Solar", es: "Solar" },
        body: { en: "The techniques work today. Homeowner customers for solar are next.", es: "Las técnicas funcionan hoy. Los dueños de casa interesados en solar vienen después." },
        liveBody: { en: "{n} role-play homeowners weighing solar, at the kitchen table.", es: "{n} dueños de casa en role-play que están pensando en solar, en la mesa de la cocina." },
      },
      {
        key: "furniture",
        name: { en: "Furniture", es: "Muebles" },
        body: { en: "The techniques work today. Showroom customers for furniture are next.", es: "Las técnicas funcionan hoy. Los clientes de una mueblería vienen después." },
        liveBody: { en: "{n} role-play showroom customers, from the sofa to the whole room.", es: "{n} clientes de mueblería en role-play, desde el sofá hasta el cuarto completo." },
      },
    ],
    more: {
      en: "Selling something else where the close matters? The techniques travel with you.",
      es: "¿Vende otra cosa donde el cierre importa? Las técnicas van con usted.",
    },
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
      en: "On the car floor, every rep line is checked against the deal's real facts and the strictest reading of Florida and FTC rules. Hardball is fine. Lying about the facts isn't.",
      es: "En el piso de carros, cada frase del vendedor se compara con los datos reales del deal y con la lectura más estricta de las reglas de Florida y de la FTC. Apretar está bien. Mentir sobre los datos, no.",
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
    h2: { en: "Invite your team. See who's ready.", es: "Invite a su equipo. Vea quién está listo." },
    sub: {
      en: "Sign up as the manager and send your people an invite link. The team view fills in as they practice: who trained, how they scored, who's certified. On the floor, a check takes under a minute.",
      es: "Inscríbase como gerente y mándele a su gente un enlace de invitación. La vista del equipo se va llenando mientras practican: quién entrenó, qué puntaje sacó, quién está certificado. En el piso, un chequeo toma menos de un minuto.",
    },
    features: [
      { en: "Invite links: your people join with their own sign-in", es: "Enlaces de invitación: su gente entra con su propio acceso" },
      { en: "Team view: who practiced, their scores, any critical flags", es: "Vista del equipo: quién practicó, sus puntajes y las banderas críticas" },
      { en: "Assign a customer to a rep, with a due date and a reason", es: "Asígnele un cliente a un vendedor, con fecha de entrega y una razón" },
      { en: "Floor checks: watch for this week's one behavior, score it in four parts", es: "Chequeos en el piso: observe el comportamiento de la semana y califíquelo en cuatro partes" },
      { en: "Admin access is a permission you give, not a job title", es: "El acceso de administrador es un permiso que usted da, no un cargo" },
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
    eyebrow: { en: "English and Spanish", es: "Inglés y español" },
    h2: { en: "It talks the way Miami buyers talk.", es: "Habla como habla el cliente de Miami." },
    body: {
      en: "Usted. El down. El trade-in. El dealer. The AI customer sounds like the people who walk through your door. Practice in either language, switch with one tap, and get scored on following the customer's lead.",
      es: "Usted. El down. El trade-in. El dealer. El cliente suena como la gente que entra por su puerta. Practique en cualquiera de los dos idiomas, cambie con un toque y reciba su puntaje por seguir al cliente.",
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

  start: {
    eyebrow: { en: "Start free", es: "Empiece gratis" },
    h2: { en: "Your next close starts here.", es: "Su próximo cierre empieza aquí." },
    sub: { en: "Two ways in. Pick the one that fits.", es: "Dos maneras de entrar. Escoja la suya." },
    team: {
      title: { en: "For a team", es: "Para un equipo" },
      body: {
        en: "Sign up as the manager, then send invite links to your people. You see the team view from day one.",
        es: "Inscríbase como gerente y mándele enlaces de invitación a su gente. Ve la vista del equipo desde el primer día.",
      },
      cta: { en: "Start a team", es: "Empezar un equipo" },
    },
    solo: {
      title: { en: "Just me", es: "Solo yo" },
      body: {
        en: "Sign up on your own and take your first lesson tonight.",
        es: "Inscríbase por su cuenta y tome su primera lección esta noche.",
      },
      cta: { en: "Start on my own", es: "Empezar por mi cuenta" },
    },
    demoNote: {
      en: "Want to look around first? The demo opens with sample logins. Nothing to set up.",
      es: "¿Quiere mirar primero? El demo abre con usuarios de muestra. No hay nada que configurar.",
    },
    seePricing: { en: "See pricing", es: "Ver precios" },
  },

  footer: {
    rights: { en: "© 2026 Sales Taptics", es: "© 2026 Sales Taptics" },
    links: { en: "Links", es: "Enlaces" },
  },
} as const;
