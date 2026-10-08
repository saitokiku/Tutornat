#!/usr/bin/env node
// Checks that every resource link (url and urlEs in src/resources/list.ts) still loads.
// HEAD first, GET if HEAD fails; redirects are followed; a link passes only if it ends at a 2xx.
// Exits 1 and lists each failing link. Usage (from apps/web):
//   npm run check:links
// which runs node with --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON.
// Those flags hide every ExperimentalWarning (type stripping is one) and the notice that package.json
// names no module type; other warnings still show.
import { readFile } from "node:fs/promises";

const LIST = new URL("../src/resources/list.ts", import.meta.url);
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 6;
const UA = "Mozilla/5.0 (compatible; KaizenEDU-link-check/1.0; +https://kaizenedu.net)";

/** [label, url] pairs. Node 22.18+ imports the .ts list directly (it strips types); older Node parses the file. */
async function load() {
  try {
    const { RESOURCES } = await import(LIST.href);
    console.log("Read the list by importing list.ts.");
    return RESOURCES.flatMap((r) => [[r.id, r.url], ...(r.urlEs ? [[`${r.id} (es)`, r.urlEs]] : [])]);
  } catch (e) {
    console.warn(`Could not import list.ts (${e.code ?? e.message}); parsing its text instead.`);
    return parse(await readFile(LIST, "utf8"));
  }
}

// Fallback: url/urlEs string literals (labelled by the helper they sit in, else the nearest id before them),
// plus helper calls such as phet("slug", ...) whose url is a template of the helper's parameters.
function parse(src) {
  const links = [];
  const helpers = [...src.matchAll(/const (\w+) = \(([^)]*)\)[^=]*=> \(\{([\s\S]*?)\n\}\);/g)];
  for (const m of src.matchAll(/\burl(Es)?: "(https:[^"]+)"/g)) {
    const helper = helpers.find((h) => m.index > h.index && m.index < h.index + h[0].length)?.[1];
    const id = helper ?? src.slice(0, m.index).match(/[\s\S]*\bid: "([^"]+)"/)?.[1] ?? "?";
    links.push([m[1] ? `${id} (es)` : id, m[2]]);
  }
  for (const [, name, params, body] of helpers) {
    const names = params.split(",").map((p) => p.split(":")[0].trim());
    const templates = [...body.matchAll(/\burl(?:Es)?: `([^`]+)`/g)].map((m) => m[1]);
    for (const call of src.matchAll(new RegExp(`\\b${name}\\(((?:\\s*"[^"]*",?)+)`, "g"))) {
      const args = [...call[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
      for (const t of templates) links.push([`${name}(${args[0]})`, t.replace(/\$\{(\w+)\}/g, (_, p) => args[names.indexOf(p)])]);
    }
  }
  return links;
}

/** null when the link ends at a 2xx, otherwise why it failed. */
async function check(url) {
  let why = "";
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, { method, redirect: "follow", headers: { "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      await res.body?.cancel();
      if (res.ok) return null;
      why = `${res.status}${res.url !== url ? ` at ${res.url}` : ""}`;
    } catch (e) {
      why = e.name === "TimeoutError" ? `no answer in ${TIMEOUT_MS / 1000} s` : (e.cause?.code ?? e.message);
    }
  }
  return why;
}

const byUrl = new Map();
for (const [label, url] of await load()) byUrl.set(url, [...(byUrl.get(url) ?? []), label]);

const queue = [...byUrl.keys()];
const failures = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const why = await check(url);
      if (why) failures.push(`${why}  ${url}  (${byUrl.get(url).join(", ")})`);
    }
  }),
);

console.log(`Checked ${byUrl.size} links.`);
if (failures.length) {
  console.error(`${failures.length} did not load:\n${failures.sort().map((f) => `  ${f}`).join("\n")}`);
  process.exit(1);
}
