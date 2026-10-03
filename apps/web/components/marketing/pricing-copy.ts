import type { L } from "./copy";

/**
 * The pricing page's lines, English and Miami Spanish. Every price is a visible placeholder until the owner sets
 * real ones: the page shows "$—", a "Placeholder price" badge on each tier and a notice at the top.
 *
 * For whoever sets the real numbers, the observed market ranges from docs/research/selling-sales-training.md
 * section 4 (third-party reports, October 2026; NOT for the page):
 *   - Solo, one rep paying for themselves: about $8-40 a month (Yoodli Pro/Advanced, Exec Starter, PitchMonster).
 *   - Team, per seat: about $20-70 a seat a month (Exec Pro, PitchMonster, Kendo, Second Nature and Hyperbound
 *     reports).
 *   - Dealership / whole store: video-library incumbents about $99-400 a month per store; AI role-play enterprise
 *     deals reported at about $15K-42K+ a year.
 *   - Annual discount norm: 15-25%; "2 months free" (about 16.7%) is the common framing.
 * Do not label a tier "most popular" until it is; "Recommended" is the honest word for now.
 */
export const pricingCopy = {
  eyebrow: { en: "Pricing", es: "Precios" },
  h1a: { en: "One price per seat.", es: "Un precio por usuario." },
  h1b: { en: "Everything to learn the close.", es: "Todo para aprender a cerrar." },
  sub: {
    en: "Every plan has the full technique library, the guided lessons, the AI customer, scoring and certification. Pick the plan that fits how you sell.",
    es: "Todos los planes traen la biblioteca completa de técnicas, las lecciones guiadas, el cliente de IA, el puntaje y la certificación. Escoja el plan que va con su manera de vender.",
  },
  notice: {
    title: { en: "Pricing is being finalized. These are placeholders.", es: "Los precios se están definiendo. Estos son provisionales." },
    body: {
      en: "Nothing is billed today, and sign-up asks for no card.",
      es: "Hoy no se cobra nada, y para inscribirse no se pide tarjeta.",
    },
  },
  billing: {
    legend: { en: "Billing", es: "Facturación" },
    monthly: { en: "Monthly", es: "Mensual" },
    annual: { en: "Annual", es: "Anual" },
    save: { en: "2 months free", es: "2 meses gratis" },
    placeholderSave: { en: "Placeholder discount", es: "Descuento provisional" },
  },
  price: {
    amount: "$—",
    badge: { en: "Placeholder price", es: "Precio provisional" },
    perSeatMonthly: { en: "per seat a month, billed monthly", es: "por usuario al mes, facturado cada mes" },
    perSeatAnnual: { en: "per seat a month, billed yearly", es: "por usuario al mes, facturado una vez al año" },
  },
  plansTitle: { en: "Plans", es: "Planes" },
  recommended: { en: "Recommended", es: "Recomendado" },
  tiers: [
    {
      key: "solo",
      name: { en: "Solo", es: "Solo" },
      who: { en: "One salesperson, training on their own.", es: "Un vendedor que entrena por su cuenta." },
      seats: { en: "1 seat", es: "1 usuario" },
      lead: null as L | null,
      features: [
        { en: "All {n} techniques and {l} guided lessons", es: "Las {n} técnicas y {l} lecciones guiadas" },
        { en: "Practice against the AI customer, talking or typing", es: "Práctica con el cliente de IA, hablando o escribiendo" },
        { en: "Every line scored, with the one change that matters most", es: "Cada frase con puntaje, y el cambio que más importa" },
        { en: "Certification path, good for 90 days", es: "Ruta de certificación, válida por 90 días" },
        { en: "English and Miami Spanish", es: "Inglés y español de Miami" },
      ] as L[],
      cta: { en: "Start on my own", es: "Empezar por mi cuenta" },
      href: "/signup?for=me",
      recommended: false,
    },
    {
      key: "team",
      name: { en: "Team", es: "Equipo" },
      who: { en: "A manager and their team.", es: "Un gerente y su equipo." },
      seats: { en: "2 to 20 seats", es: "De 2 a 20 usuarios" },
      lead: { en: "Everything in Solo, plus:", es: "Todo lo de Solo, y además:" } as L | null,
      features: [
        { en: "Invite links for your people", es: "Enlaces de invitación para su gente" },
        { en: "Manager team view: who practiced, scores, critical flags", es: "Vista del equipo para el gerente: quién practicó, puntajes, banderas críticas" },
        { en: "Assignments with a due date and a reason", es: "Asignaciones con fecha de entrega y una razón" },
        { en: "Floor checks in under a minute", es: "Chequeos en el piso en menos de un minuto" },
      ] as L[],
      cta: { en: "Start a team", es: "Empezar un equipo" },
      href: "/signup",
      recommended: true,
    },
    {
      key: "dealership",
      name: { en: "Dealership", es: "Concesionario" },
      who: { en: "A full store or a larger team.", es: "Una tienda completa o un equipo más grande." },
      seats: { en: "More than 20 seats", es: "Más de 20 usuarios" },
      lead: { en: "Everything in Team, plus:", es: "Todo lo de Equipo, y además:" } as L | null,
      features: [
        { en: "Admin access controls", es: "Controles de acceso de administrador" },
        { en: "Store setup with your real fees and lenders, so the compliance engine checks practice against your numbers", es: "Configuración de la tienda con sus cargos y bancos reales, para que el motor de cumplimiento revise la práctica con sus números" },
        { en: "Store numbers and calibration", es: "Números de la tienda y calibración" },
        { en: "Usage and AI cost views", es: "Vistas de uso y de costo de IA" },
        { en: "Audit log and CSV export", es: "Registro de auditoría y exportación a CSV" },
        { en: "Priority onboarding", es: "Arranque con prioridad" },
      ] as L[],
      cta: { en: "Set up your store", es: "Configurar su tienda" },
      href: "/signup",
      recommended: false,
    },
  ],
  faq: {
    title: { en: "Questions, answered plainly", es: "Preguntas, con respuestas claras" },
    items: [
      {
        q: { en: "Is there a free trial?", es: "¿Hay una prueba gratis?" },
        a: {
          en: "You can start free today: sign-up asks for no card. Trial terms are being finalized along with prices, and nothing is billed in the meantime.",
          es: "Puede empezar gratis hoy: para inscribirse no se pide tarjeta. Las condiciones de la prueba se están definiendo junto con los precios, y mientras tanto no se cobra nada.",
        },
      },
      {
        q: { en: "Can I cancel?", es: "¿Puedo cancelar?" },
        a: {
          en: "Nothing is billed today, so there is nothing to cancel. Cancellation terms come with the final prices.",
          es: "Hoy no se cobra nada, así que no hay nada que cancelar. Las condiciones para cancelar llegan con los precios finales.",
        },
      },
      {
        q: { en: "What languages does it speak?", es: "¿En qué idiomas funciona?" },
        a: {
          en: "English and Miami Spanish: the lessons, the AI customer and the scoring. Each person picks a language and can switch with one tap.",
          es: "Inglés y español de Miami: las lecciones, el cliente de IA y el puntaje. Cada persona escoge su idioma y lo puede cambiar con un toque.",
        },
      },
      {
        q: { en: "Is it only for car sales?", es: "¿Es solo para venta de carros?" },
        a: {
          en: "No. The techniques work for any high-ticket sale. Car sales has the deepest set of role-play customers, one for every objection; homes, solar and furniture each have a starter set of their own, with more on the way. Anyone else practices the techniques with the car customers.",
          es: "No. Las técnicas sirven para cualquier venta de alto valor. La venta de carros tiene el grupo más completo de clientes de role-play, uno para cada objeción; casas, solar y muebles tienen cada uno un primer grupo propio, y vienen más. Cualquier otra venta practica las técnicas con los clientes de carros.",
        },
      },
      {
        q: { en: "Who can see my practice?", es: "¿Quién puede ver mi práctica?" },
        a: {
          en: "Practice sessions are recorded and transcribed for training. A rep's sessions stay private to them for a window the store sets, up to 72 hours; after that, their managers can see them to coach. Recordings are never used to train AI models.",
          es: "Las sesiones de práctica se graban y se transcriben para entrenamiento. Las sesiones de un vendedor son privadas durante una ventana que fija la tienda, de hasta 72 horas; después, sus gerentes las pueden ver para entrenarlo. Las grabaciones nunca se usan para entrenar modelos de inteligencia artificial.",
        },
      },
      {
        q: { en: "What counts as a seat?", es: "¿Qué cuenta como un usuario?" },
        a: {
          en: "One person with their own sign-in, usually each rep and each manager. The final seat rules come with the final prices.",
          es: "Una persona con su propio acceso, normalmente cada vendedor y cada gerente. Las reglas finales llegan con los precios finales.",
        },
      },
    ],
  },
  closing: {
    h2: { en: "Not sure yet? Look around first.", es: "¿Todavía no está seguro? Mire primero." },
    body: { en: "The demo opens with sample logins. Nothing to set up.", es: "El demo abre con usuarios de muestra. No hay nada que configurar." },
  },
};
