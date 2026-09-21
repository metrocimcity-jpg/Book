import { createSunburst } from "./sunburst.js";
import { createPanel } from "./panel.js";
import { createSearch } from "./search.js";
import { $, el, clear } from "./util/dom.js";
import { filterExtinct, expandSpeciesUnder, pathNames, countsUnder } from "./util/tree.js";
import { parseView, writeView } from "./util/url.js";
import { formatNumber } from "./util/format.js";
import { applyNameLang, displayName, normalizeNameLang } from "./util/names.js";
import {
  CATEGORIES,
  categoryById,
  parseGroup,
  groupHref,
  dataHref,
  assetHref,
  rebaseCredits
} from "./catalog.js";

const status = $("#chart-status");
const chartEl = $("#chart");
const live = $("#live");

function announce(text) {
  live.textContent = text;
}

function showStatus(text) {
  if (!status) return;
  status.hidden = !text;
  status.textContent = text || "";
}

async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

function crumbLabel(node, lang, vernacular) {
  return displayName(node, lang, vernacular);
}

function renderBreadcrumbs(path, onFocus, lang, vernacular) {
  const ol = $("#breadcrumbs ol");
  clear(ol);
  const narrow = window.matchMedia("(max-width: 640px)").matches && path.length > 3;
  path.forEach((node, i) => {
    const last = i === path.length - 1;
    const hide = narrow && i > 0 && i < path.length - 1;
    if (hide && i === 1) {
      const more = el("li", {}, [el("button", { type: "button", text: "…" })]);
      more.querySelector("button").addEventListener("click", () => {
        path.slice(1, -1).forEach((n) => onFocus(n));
      });
      ol.append(more);
    }
    if (hide) return;
    const li = el("li");
    const text = crumbLabel(node, lang, vernacular);
    if (last) {
      li.append(el("span", { "aria-current": "location", text }));
    } else {
      const btn = el("button", { type: "button", text });
      btn.addEventListener("click", () => onFocus(node));
      li.append(btn);
    }
    ol.append(li);
  });
}

function renderTextTree(root, host, lang, vernacular) {
  clear(host);
  const orders = root.children || [];
  if (!orders.length) {
    host.append(el("p", { text: "Taxonomy not built yet. Nothing to outline." }));
    return;
  }
  const list = el("ul");
  for (const order of orders) {
    const li = el("li", {}, [`${displayName(order, lang, vernacular)} (${formatNumber(countsUnder(order).species)} species)`]);
    const fams = el("ul");
    for (const family of order.children || []) {
      const fli = el("li", {}, [displayName(family, lang, vernacular)]);
      const details = el("details");
      details.append(el("summary", { text: `${(family.children || []).length} genera` }));
      const gl = el("ul");
      for (const genus of family.children || []) gl.append(el("li", { text: displayName(genus, lang, vernacular) }));
      details.append(gl);
      fli.append(details);
      fams.append(fli);
    }
    li.append(fams);
    list.append(li);
  }
  host.append(list);
}

function pathFromFocus(focus) {
  if (!focus) return [];
  return focus.ancestors().slice().reverse().map((d) => d.data);
}

function applyChrome(category) {
  document.title = `${category.title} — a zoomable sunburst`;
  const eyebrow = $(".eyebrow");
  const heading = $(".brand h1");
  const lede = $(".lede");
  const caption = $("#chart figcaption");
  const citation = $("#citation");
  const creditsLink = $("#credits-link");
  const aboutLink = $("#about-link");
  const textTreeHint = $("#text-tree-body");
  if (eyebrow) eyebrow.textContent = category.eyebrow;
  if (heading) heading.textContent = category.title;
  if (lede) lede.textContent = category.lede;
  if (caption) caption.textContent = category.figcaption;
  if (citation) citation.textContent = `${category.sourceFallback}. Artwork licences are listed per file.`;
  if (creditsLink) {
    creditsLink.href = `${category.folder}/CREDITS.md`;
    creditsLink.textContent = "Image credits";
  }
  if (aboutLink) {
    aboutLink.href = `${category.folder}/README.md`;
  }
  if (textTreeHint && !category.harvested) {
    textTreeHint.innerHTML = "";
    textTreeHint.append(el("p", {}, [
      "Taxonomy has not been harvested yet. Rebuild ",
      el("code", { text: `data/${category.dataFile}` }),
      " when a source is chosen."
    ]));
  }
}

function renderGroupNav(activeId) {
  const nav = $("#group-nav");
  if (!nav) return;
  clear(nav);
  const list = el("ul");
  for (const cat of CATEGORIES) {
    const li = el("li");
    const link = el("a", {
      href: groupHref(cat.id),
      text: cat.label
    });
    if (cat.id === activeId) link.setAttribute("aria-current", "page");
    li.append(link);
    list.append(li);
  }
  nav.append(list);
}

async function boot() {
  const groupId = parseGroup(location.search);
  const category = categoryById(groupId) || CATEGORIES[0];
  const placeholder = assetHref(category, "assets/img/placeholder.svg");

  applyChrome(category);
  renderGroupNav(category.id);

  let tree;
  let meta;
  let credits = {};
  try {
    tree = await loadJson(dataHref(category, category.dataFile));
  } catch (err) {
    showStatus(`Data not built yet. Add ${category.folder}/data/${category.dataFile}.`);
    console.info(`${category.dataFile} missing or unreadable`, err);
    return;
  }

  try { meta = await loadJson(dataHref(category, "meta.json")); } catch { meta = null; }
  try { credits = rebaseCredits(await loadJson(assetHref(category, "assets/credits.json")), category); } catch { credits = {}; }
  let vernacular = {};
  try { vernacular = await loadJson(dataHref(category, "vernacular.json")); } catch { vernacular = {}; }

  const totalSpecies = countsUnder(tree).species;
  const orderCount = (tree.children || []).length;
  console.info(`Loaded ${category.title}: ${totalSpecies} species, ${orderCount} orders`);

  if (meta) {
    const parts = [meta.source || category.sourceFallback, meta.version, meta.doi, meta.retrievedAt ? `retrieved ${meta.retrievedAt}` : ""]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    $("#citation").textContent = parts.join(" · ");
  }

  if (!orderCount) {
    showStatus(category.harvested
      ? "Taxonomy file has no orders."
      : "Taxonomy not built yet. This group is a scaffold — names will come from a checklist, not from copied mammal taxa.");
  } else {
    showStatus("");
  }

  const initial = parseView(location.hash);
  let namesLang = normalizeNameLang(initial.lang);
  applyNameLang(namesLang);
  const nameRadios = document.getElementsByName("names");
  nameRadios.forEach((input) => { input.checked = input.value === namesLang; });

  const panel = createPanel($("#panel"), {
    credits,
    meta,
    totalSpecies,
    vernacular,
    namesLang,
    noun: category.noun,
    sourceFallback: category.sourceFallback,
    sourceLink: category.sourceLink,
    placeholder
  });

  renderTextTree(tree, $("#text-tree-body"), namesLang, vernacular);

  let includeExtinct = $("#toggle-extinct").checked;
  let showSpecies = false;
  let sizing = "species";
  let selectedSpecies = null;
  let speciesTree = null;
  let hasSelection = false;

  function currentTree() {
    const base = filterExtinct(tree, includeExtinct);
    if (!showSpecies) return base;
    return expandSpeciesUnder(base, currentPathNames.slice(1));
  }

  let currentPathNames = [];
  const chart = createSunburst(chartEl, currentTree(), {
    sizing,
    credits,
    namesLang,
    vernacular,
    placeholder,
    ariaLabel: category.figcaption,
    rootName: category.title
  });

  chart.on("focus", (d) => {
    const path = pathFromFocus(d);
    currentPathNames = path.map((n) => n.name);
    renderBreadcrumbs(path, (node) => {
      chart.focus(node);
    }, namesLang, vernacular);
    const species = countsUnder(d.data).species;
    announce(`Focused ${displayName(d.data, namesLang, vernacular)}, ${d.data.rank || category.eyebrow.toLowerCase()}, ${formatNumber(species)} species.`);
    $("#toggle-species").disabled = !path.some((n) => n.rank === "family" || n.rank === "genus");
    panel.show(d.data, { speciesName: selectedSpecies });
    writeView(pathNames(path), selectedSpecies, namesLang);
  });

  chart.on("hover", (d) => {
    if (hasSelection) return;
    if (!d) {
      panel.empty();
      return;
    }
    panel.show(d.data);
  });

  chart.on("select", (d) => {
    hasSelection = true;
    selectedSpecies = d.data.rank === "species" ? d.data.name : selectedSpecies;
    panel.show(d.data, { speciesName: selectedSpecies });
    writeView(pathNames(pathFromFocus(d)), selectedSpecies, namesLang);
  });

  createSearch($("#search-input"), $("#search-listbox"), tree, {
    vernacular,
    getLang: () => namesLang
  }).on("select", (item) => {
    hasSelection = true;
    selectedSpecies = item.rank === "species" ? item.name : null;
    const names = item.path;
    chart.setRoot(currentTree(), names);
    panel.show(item.node, { speciesName: selectedSpecies });
    writeView(names, selectedSpecies, namesLang);
  });

  document.getElementsByName("names").forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      namesLang = normalizeNameLang(input.value);
      applyNameLang(namesLang);
      chart.setNames(namesLang, vernacular);
      panel.setNames(namesLang, vernacular);
      renderTextTree(tree, $("#text-tree-body"), namesLang, vernacular);
      const focus = chart.getFocus();
      if (focus) {
        renderBreadcrumbs(pathFromFocus(focus), (node) => chart.focus(node), namesLang, vernacular);
      }
      writeView(pathNames(pathFromFocus(focus) || []), selectedSpecies, namesLang);
    });
  });

  document.getElementsByName("sizing").forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      sizing = input.value;
      chart.setSizing(sizing);
    });
  });

  $("#toggle-extinct").addEventListener("change", async (event) => {
    includeExtinct = event.target.checked;
    chart.setRoot(currentTree(), currentPathNames.slice(1));
  });

  $("#toggle-species").addEventListener("change", async (event) => {
    showSpecies = event.target.checked;
    if (showSpecies && !speciesTree) {
      try { speciesTree = await loadJson(dataHref(category, category.speciesFile)); } catch { speciesTree = null; }
    }
    const keep = currentPathNames.slice(1);
    if (showSpecies && speciesTree && keep.length >= 2) {
      const focused = expandSpeciesUnder(filterExtinct(speciesTree, includeExtinct), keep);
      chart.setRoot(focused, keep);
    } else {
      chart.setRoot(currentTree(), keep);
    }
  });

  $("#reset-view").addEventListener("click", () => {
    selectedSpecies = null;
    hasSelection = false;
    showSpecies = false;
    $("#toggle-species").checked = false;
    chart.setRoot(filterExtinct(tree, includeExtinct), []);
    writeView([], null, namesLang);
    panel.empty();
  });

  window.addEventListener("popstate", () => {
    const nextId = parseGroup(location.search);
    if (nextId !== category.id) {
      location.reload();
      return;
    }
    const view = parseView(location.hash);
    selectedSpecies = view.species;
    namesLang = normalizeNameLang(view.lang);
    applyNameLang(namesLang);
    nameRadios.forEach((input) => { input.checked = input.value === namesLang; });
    chart.setNames(namesLang, vernacular);
    panel.setNames(namesLang, vernacular);
    chart.setRoot(currentTree(), view.names);
    const focus = chart.getFocus();
    panel.show(focus?.data, { speciesName: selectedSpecies });
  });

  if (initial.names.length || initial.species) {
    selectedSpecies = initial.species;
    chart.setRoot(currentTree(), initial.names);
    panel.show(chart.getFocus()?.data, { speciesName: selectedSpecies });
  }
}

boot();
