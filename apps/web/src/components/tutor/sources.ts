// Links to where the tutor's knowledge comes from. Pure, so the server's tools and the browser's demo
// tutor build the same links.

/** The Wiktionary entry behind a Datamuse definition. */
export const wiktionaryUrl = (word: string) => `https://en.wiktionary.org/wiki/${encodeURIComponent(word.toLowerCase().trim().replace(/ /g, "_"))}`;

/** The official page for a Common Core code: 4.NF.A.1 → /Math/Content/4/NF/A/1/, RF.K.3a → /ELA-Literacy/RF/K/3/, A-REI.B.3 → /Math/Content/HSA/REI/B/3/. */
export function standardUrl(code: string): string {
  const base = "https://www.thecorestandards.org";
  const ela = /^(RF|RL|RI|W|SL|L)\.([K\d][\d-]*)\.(\d+)/.exec(code);
  if (ela) return `${base}/ELA-Literacy/${ela[1]}/${ela[2]}/${ela[3]}/`;
  const hs = /^([A-Z])-([A-Z]+)\.([A-Z])\.(\d+)/.exec(code);
  if (hs) return `${base}/Math/Content/HS${hs[1]}/${hs[2]}/${hs[3]}/${hs[4]}/`;
  const math = /^([K\d])\.([A-Z]+)\.([A-Z])\.(\d+)([a-z])?/.exec(code);
  if (math) return `${base}/Math/Content/${math[1]}/${math[2]}/${math[3]}/${math[4]}/${math[5] ? `${math[5]}/` : ""}`;
  return `${base}/read-the-standards/`;
}
