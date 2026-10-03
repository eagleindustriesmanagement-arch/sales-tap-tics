import type { Language } from "@taptics/i18n";
import "@/app/marketing.css";
import { Bilingual } from "./bilingual";
import { Footer } from "./footer";
import { Hero } from "./hero";
import { How } from "./how";
import { Industries } from "./industries";
import { Managers } from "./managers";
import { MarketingMotion } from "./motion";
import { Nav } from "./nav";
import { Research } from "./research";
import { Roi } from "./roi";
import { Scoring } from "./scoring";
import { Start } from "./start";
import { Techniques } from "./techniques";

/**
 * The public home page (decision 0028): sales training for every high-ticket close, simple to use and deep to
 * learn. Server components throughout; only the hero's light (WebGL), the motion controller, the rail's pause
 * button and the ROI calculator run in the browser. It sits inside the app frame's <main>, so it brings its own
 * header and footer but never a second main.
 */
export function Marketing({ lang }: { lang: Language }) {
  return (
    <div data-mkt className="mkt" lang={lang}>
      <span className="mkt-grain" aria-hidden="true" />
      <Nav lang={lang} />
      <Hero lang={lang} />
      <Research lang={lang} />
      <Roi lang={lang} />
      <How lang={lang} />
      <Techniques lang={lang} />
      <Industries lang={lang} />
      <Scoring lang={lang} />
      <Managers lang={lang} />
      <Bilingual lang={lang} />
      <Start lang={lang} />
      <Footer lang={lang} />
      <MarketingMotion />
    </div>
  );
}
