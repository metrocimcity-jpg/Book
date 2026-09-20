export function serializeView(pathNames, speciesName, lang = "la") {
  const path = pathNames.map(encodeURIComponent).join("/");
  const hash = path ? `#/${path}` : "#/";
  const parts = [];
  if (speciesName) parts.push(`species=${encodeURIComponent(speciesName)}`);
  if (lang && lang !== "la") parts.push(`names=${encodeURIComponent(lang)}`);
  return parts.length ? `${hash}?${parts.join("&")}` : hash;
}

export function parseView(hash = "") {
  const raw = String(hash).replace(/^#/, "");
  const [pathPart, queryPart] = raw.split("?");
  const names = pathPart
    .split("/")
    .map((s) => decodeURIComponent(s))
    .filter(Boolean);
  const params = new URLSearchParams(queryPart || "");
  const species = params.get("species");
  const lang = params.get("names") || "la";
  return { names, species: species || null, lang };
}

export function writeView(pathNames, speciesName, lang = "la") {
  const next = serializeView(pathNames, speciesName, lang);
  if (location.hash === next || (next === "#/" && !location.hash)) return;
  history.pushState({ names: pathNames, species: speciesName || null, lang }, "", next);
}
