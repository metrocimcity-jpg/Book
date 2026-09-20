import { el, clear } from "./util/dom.js";
import { formatNumber, formatPercent, italicRank, titleRank, speciesCount, iucnClass } from "./util/format.js";
import { displayName } from "./util/names.js";
import { countsUnder } from "./util/tree.js";

const PAGE = 60;

export function createPanel(root, { credits = {}, meta = null, totalSpecies = 0, vernacular = {}, namesLang = "la" } = {}) {
  const heading = root.querySelector("#panel-heading") || root.querySelector("h2");
  const body = root.querySelector("#panel-body") || root;
  let selected = null;
  let highlight = null;
  let page = 0;
  let lang = namesLang;
  let names = vernacular;

  function label(node) {
    return displayName(node, lang, names);
  }

  function creditFor(name) {
    return credits[name] || null;
  }

  function empty() {
    heading.textContent = "About this chart";
    heading.classList.remove("italic");
    clear(body);
    body.append(
      el("p", { text: "Click an arc to zoom into an order, family, or genus. Hover to preview. Search or use the breadcrumbs to jump." }),
      meta ? citation(meta) : null
    );
  }

  function citation(info) {
    return el("p", { class: "citation-block" }, [
      `${info.source || "AviList: The Global Avian Checklist"} ${info.version || ""}. `,
      info.doi ? el("a", { href: `https://doi.org/${info.doi}`, rel: "noopener noreferrer" }, info.doi) : null,
      info.retrievedAt ? ` Retrieved ${info.retrievedAt}.` : ""
    ]);
  }

  function artwork(node) {
    const credit = creditFor(node.name);
    const src = credit?.file || "assets/img/placeholder.svg";
    const src2x = credit?.file2x;
    const img = el("img", {
      class: "art",
      src,
      alt: credit ? `${credit.title || node.name}` : "No free illustration found yet"
    });
    if (src2x) img.setAttribute("srcset", `${src} 1x, ${src2x} 2x`);
    const captionBits = [];
    if (!credit) captionBits.push("No free illustration found yet.");
    else {
      captionBits.push(credit.title || node.name);
      if (credit.creator) captionBits.push(credit.creator);
      if (credit.kind === "photo") captionBits.push("Photograph");
      if (credit.resolvedFrom && credit.resolvedFrom !== node.name) {
        captionBits.push(`Illustration of ${credit.resolvedFrom}, representing ${node.name}`);
      }
    }
    const cap = el("figcaption");
    cap.append(captionBits.join(" · "));
    if (credit?.license && credit.licenseUrl) {
      cap.append(" · ", el("a", { href: credit.licenseUrl, rel: "noopener noreferrer" }, credit.license));
    }
    if (credit?.sourceUrl) {
      cap.append(" · ", el("a", { href: credit.sourceUrl, rel: "noopener noreferrer" }, credit.source || "Source"));
    }
    return el("figure", {}, [img, cap]);
  }

  function speciesList(node) {
    const species = node.species || [];
    if (!species.length) return null;
    const start = page * PAGE;
    const slice = species.slice(start, start + PAGE);
    const list = el("ul", { class: "species-list" });
    for (const s of slice) {
      const item = el("li", { class: highlight && s.name === highlight ? "highlight" : null }, [
        el("span", {}, [
          lang === "la" ? el("em", { text: label(s) }) : el("span", { text: label(s) }),
          lang !== "la" && s.name !== label(s) ? ` — ${s.name}` : ""
        ]),
        el("span", { class: `chip ${iucnClass(s.iucn)}`, text: iucnClass(s.iucn), title: `IUCN ${iucnClass(s.iucn)}` }),
        el("span", { text: s.year ? String(s.year) : "" })
      ]);
      list.append(item);
    }
    const wrap = el("div");
    wrap.append(el("h3", { text: "Species" }), list);
    if (species.length > PAGE) {
      const nav = el("p");
      const prev = el("button", { type: "button", text: "Previous" });
      const next = el("button", { type: "button", text: "Next" });
      prev.disabled = page === 0;
      next.disabled = start + PAGE >= species.length;
      prev.addEventListener("click", () => { page -= 1; show(node, { speciesName: highlight }); });
      next.addEventListener("click", () => { page += 1; show(node, { speciesName: highlight }); });
      nav.append(prev, ` ${start + 1}–${Math.min(start + PAGE, species.length)} of ${species.length} `, next);
      wrap.append(nav);
    }
    return wrap;
  }

  function links(node) {
    const q = encodeURIComponent(node.name);
    return el("p", { class: "ext-links" }, [
      el("a", { class: "ext", href: `https://en.wikipedia.org/wiki/${q}`, rel: "noopener noreferrer", target: "_blank" }, "Wikipedia (leaves page)"),
      el("a", { class: "ext", href: `https://www.gbif.org/species/search?q=${q}`, rel: "noopener noreferrer", target: "_blank" }, "GBIF (leaves page)"),
      el("a", { class: "ext", href: `https://www.avilist.org/`, rel: "noopener noreferrer", target: "_blank" }, "AviList (leaves page)")
    ]);
  }

  function show(node, { speciesName = null } = {}) {
    if (!node) {
      selected = null;
      empty();
      return;
    }
    if (selected !== node) page = 0;
    selected = node;
    highlight = speciesName;
    if (speciesName && node.species) {
      const idx = node.species.findIndex((s) => s.name === speciesName);
      if (idx >= 0) page = Math.floor(idx / PAGE);
    }
    heading.textContent = label(node);
    heading.classList.toggle("italic", italicRank(node.rank) && lang === "la");
    clear(body);
    const n = countsUnder(node);
    const species = n.species || speciesCount(node);
    const rankLine = lang === "la"
      ? `${titleRank(node.rank)}${node.common ? ` · ${node.common}` : ""}`
      : `${titleRank(node.rank)} · ${node.name}`;
    body.append(
      el("p", { class: "rank", text: rankLine }),
      artwork(node),
      el("div", { class: "counts" }, [
        el("div", {}, [el("b", { text: formatNumber(n.families) }), " families"]),
        el("div", {}, [el("b", { text: formatNumber(n.genera) }), " genera"]),
        el("div", {}, [el("b", { text: formatNumber(species) }), " species"]),
        el("div", {}, [el("b", { text: formatPercent(species, totalSpecies) }), " of birds"])
      ]),
      speciesList(node),
      links(node)
    );
  }

  empty();
  return {
    show,
    empty,
    citation,
    setNames(nextLang, nextVernacular) {
      lang = nextLang || lang;
      if (nextVernacular) names = nextVernacular;
      if (selected) show(selected, { speciesName: highlight });
    }
  };
}
