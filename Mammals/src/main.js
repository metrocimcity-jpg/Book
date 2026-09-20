import { createSunburst } from "./sunburst.js";
import { createPanel } from "./panel.js";
import { createSearch } from "./search.js";
import { $, el, clear } from "./util/dom.js";
import { filterExtinct, expandSpeciesUnder, pathNames, countsUnder } from "./util/tree.js";
import { parseView, writeView } from "./util/url.js";
import { formatNumber } from "./util/format.js";
import { applyNameLang, displayName, normalizeNameLang } from "./util/names.js";

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
  const list = el("ul");
  for (const order of root.children || []) {
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

async function boot() {
  let tree;
  let meta;
  let credits = {};
  try {
    tree = await loadJson("data/mammals.json");
  } catch (err) {
    showStatus("Data not built yet. Run npm run data in the mammals folder.");
    console.info("mammals.json missing or unreadable", err);
    return;
  }

  try { meta = await loadJson("data/meta.json"); } catch { meta = null; }
  try { credits = await loadJson("assets/credits.json"); } catch { credits = {}; }
  let vernacular = {};
  try { vernacular = await loadJson("data/vernacular.json"); } catch { vernacular = {}; }

  const totalSpecies = countsUnder(tree).species;
  console.info(`Loaded Mammalia: ${totalSpecies} species, ${(tree.children || []).length} orders`);
  showStatus("");

  const initial = parseView(location.hash);
  let namesLang = normalizeNameLang(initial.lang);
  applyNameLang(namesLang);
  const nameRadios = document.getElementsByName("names");
  nameRadios.forEach((input) => { input.checked = input.value === namesLang; });

  const panel = createPanel($("#panel"), { credits, meta, totalSpecies, vernacular, namesLang });
  if (meta) {
    $("#citation").textContent = `${meta.source || "ASM Mammal Diversity Database"} ${meta.version || ""} · ${meta.doi || ""} · retrieved ${meta.retrievedAt || ""}`;
  }

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
  const chart = createSunburst(chartEl, currentTree(), { sizing, credits, namesLang, vernacular });

  chart.on("focus", (d) => {
    const path = pathFromFocus(d);
    currentPathNames = path.map((n) => n.name);
    renderBreadcrumbs(path, (node) => {
      chart.focus(node);
    }, namesLang, vernacular);
    const species = countsUnder(d.data).species;
    announce(`Focused ${displayName(d.data, namesLang, vernacular)}, ${d.data.rank || "class"}, ${formatNumber(species)} species.`);
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
    const panelNode = item.rank === "species" ? item.node : item.node;
    panel.show(panelNode, { speciesName: selectedSpecies });
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
      try { speciesTree = await loadJson("data/mammals.species.json"); } catch { speciesTree = null; }
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
