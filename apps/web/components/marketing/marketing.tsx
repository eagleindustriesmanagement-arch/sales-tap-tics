import type { Language } from "@taptics/i18n";
import "@/app/marketing.css";
import { Bilingual } from "./bilingual";
import { Footer } from "./footer";
import { Hero } from "./hero";
import { How } from "./how";
import { LibraryRail } from "./library-rail";
import { Managers } from "./managers";
import { MarketingMotion } from "./motion";
import { Nav } from "./nav";
import { Pilot } from "./pilot";
import { Scoring } from "./scoring";

/**
 * The public home page (decision 0028): what a dealer principal or GM sees first. Server components throughout;
 * only the hero's light (WebGL), the motion controller and the rail's pause button run in the browser.
 * It sits inside the app frame's <main>, so it brings its own header and footer but never a second main.
 */
export function Marketing({ lang }: { lang: Language }) {
  return (
    <div data-mkt className="mkt" lang={lang}>
      <span className="mkt-grain" aria-hidden="true" />
      <Nav lang={lang} />
      <Hero lang={lang} />
      <div className="mkt-hairline mx-auto max-w-5xl" />
      <How lang={lang} />
      <LibraryRail lang={lang} />
      <Scoring lang={lang} />
      <Managers lang={lang} />
      <Bilingual lang={lang} />
      <Pilot lang={lang} />
      <Footer lang={lang} />
      <MarketingMotion />
    </div>
  );
}
