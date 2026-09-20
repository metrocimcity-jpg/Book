/**
 * Display-language helpers. Latin is the scientific name on the node.
 * English prefers the source checklist common name, then a Wikidata label.
 * Persian comes only from Wikidata. Missing vernaculars fall back to Latin —
 * never invented.
 */
export const NAME_LANGS = ["la", "en", "fa"];

export function normalizeNameLang(value) {
  const v = String(value || "").toLowerCase();
  return NAME_LANGS.includes(v) ? v : "la";
}

export function displayName(node, lang = "la", vernacular = {}) {
  if (!node) return "";
  const sci = node.name || "";
  const entry = vernacular[sci] || {};
  const mode = normalizeNameLang(lang);
  if (mode === "en") return node.common || entry.en || sci;
  if (mode === "fa") return entry.fa || sci;
  return sci;
}

export function searchKey(node, vernacular = {}) {
  const sci = node?.name || "";
  const entry = vernacular[sci] || {};
  return `${sci} ${node?.common || ""} ${entry.en || ""} ${entry.fa || ""}`.toLowerCase();
}

export function applyNameLang(lang, { root = document.documentElement, body = document.body } = {}) {
  const mode = normalizeNameLang(lang);
  root.lang = mode === "fa" ? "fa" : "en";
  root.dir = "ltr";
  body.classList.toggle("names-fa", mode === "fa");
  return mode;
}
