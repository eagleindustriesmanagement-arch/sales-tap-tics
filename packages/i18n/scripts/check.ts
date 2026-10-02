import { missingTranslations } from "../src/translate.js";

const problems = missingTranslations();
if (problems.length > 0) {
  for (const p of problems) console.error(`i18n: ${p.key} [${p.language}] ${p.detail}`);
  process.exit(1);
}
console.log("i18n: every string present in English and Spanish");
