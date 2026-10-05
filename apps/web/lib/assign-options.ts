import { t, type Language } from "@taptics/i18n";

/** The industries with role-play customers, in the order the rep's Practice page lists them. */
const INDUSTRIES = ["cars", "homes", "solar", "furniture"] as const;
type Industry = (typeof INDUSTRIES)[number];

export interface AssignScenario {
  code: string;
  industry: string;
  level: number;
  title: string;
}

export interface AssignOption {
  code: string;
  label: string;
}

export interface AssignGroup {
  industry: Industry;
  label: string;
  own: boolean;
  options: AssignOption[];
}

/**
 * The Assign screen's scenario choices (decision 0033): the team's own industry first, every other industry after it
 * in its own labeled group, so an owner does not hand a solar customer to a car rep by mistake (the titles repeat
 * across industries: "I'm just looking" is in all four). Every label is unique: the level is in each one, and the
 * industry is named on every option outside the team's own. A team with no customers of its own yet ("other",
 * decision 0033) practices the car customers, so cars comes first for it.
 */
export function assignGroups(scenarios: AssignScenario[], teamIndustry: string, lang: Language): AssignGroup[] {
  const has = (i: string) => scenarios.some((s) => s.industry === i);
  const own: Industry = (INDUSTRIES as readonly string[]).includes(teamIndustry) && has(teamIndustry) ? (teamIndustry as Industry) : "cars";
  const order = [own, ...INDUSTRIES.filter((i) => i !== own)];
  const seen = new Set<string>();
  const unique = (label: string, code: string) => {
    // Two customers with the same title at the same level in one industry would still read alike: name the code.
    const out = seen.has(label) ? `${label} (${code})` : label;
    seen.add(out);
    return out;
  };
  return order
    .map((industry) => {
      const name = t(`industry.${industry}`, lang);
      const options = scenarios
        .filter((s) => s.industry === industry)
        .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title, lang) || a.code.localeCompare(b.code))
        .map((s) => {
          const base = `${t("practice.level", lang, { n: s.level })} · ${s.title}`;
          return { code: s.code, label: unique(industry === own ? base : `${name} · ${base}`, s.code) };
        });
      return { industry, own: industry === own, label: industry === own ? t("assign.ownIndustry", lang, { industry: name }) : name, options };
    })
    .filter((g) => g.options.length > 0);
}
