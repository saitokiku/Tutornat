import type { Locale } from "@/lib/types";

/** Pick the English or Spanish string. Generators build their copy inline so a skill reads as one unit. */
export const tr = (locale: Locale, en: string, es: string) => (locale === "es" ? es : en);

/** A true minus sign for display. */
export const show = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n));

/** How a number is read aloud: "minus 4", not "dash 4". */
export const sayNum = (n: number, locale: Locale) => (n < 0 ? `${tr(locale, "minus", "menos")} ${Math.abs(n)}` : String(n));

const EN_DEN: Record<number, [string, string]> = {
  2: ["half", "halves"], 3: ["third", "thirds"], 4: ["fourth", "fourths"], 5: ["fifth", "fifths"], 6: ["sixth", "sixths"],
  7: ["seventh", "sevenths"], 8: ["eighth", "eighths"], 9: ["ninth", "ninths"], 10: ["tenth", "tenths"], 12: ["twelfth", "twelfths"],
  100: ["hundredth", "hundredths"],
};
const ES_DEN: Record<number, [string, string]> = {
  2: ["medio", "medios"], 3: ["tercio", "tercios"], 4: ["cuarto", "cuartos"], 5: ["quinto", "quintos"], 6: ["sexto", "sextos"],
  7: ["séptimo", "séptimos"], 8: ["octavo", "octavos"], 9: ["noveno", "novenos"], 10: ["décimo", "décimos"], 12: ["doceavo", "doceavos"],
  100: ["centésimo", "centésimos"],
};

/** "3 fourths" / "3 cuartos"; falls back to "3 over 7" for denominators without a common name. */
export function sayFrac(n: number, d: number, locale: Locale) {
  const sign = n < 0 ? `${tr(locale, "minus", "menos")} ` : "";
  const a = Math.abs(n);
  const names = (locale === "es" ? ES_DEN : EN_DEN)[d];
  if (!names) return `${sign}${a} ${tr(locale, "over", "sobre")} ${d}`;
  return `${sign}${a} ${a === 1 ? names[0] : names[1]}`;
}
