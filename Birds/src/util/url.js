export function serializeView(pathNames, speciesName) {
  const path = pathNames.map(encodeURIComponent).join("/");
  const hash = path ? `#/${path}` : "#/";
  if (!speciesName) return hash;
  return `${hash}?species=${encodeURIComponent(speciesName)}`;
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
  return { names, species: species || null };
}

export function writeView(pathNames, speciesName) {
  const next = serializeView(pathNames, speciesName);
  if (location.hash === next || (next === "#/" && !location.hash)) return;
  history.pushState({ names: pathNames, species: speciesName || null }, "", next);
}
