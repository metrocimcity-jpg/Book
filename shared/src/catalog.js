/** Catalog of life-group apps. Each folder holds data, tokens, and images. */

export const CATEGORIES = [
  {
    id: "mammals",
    folder: "Mammals",
    label: "Mammals",
    eyebrow: "Class",
    title: "Mammalia",
    lede: "A zoomable sunburst of living and recently extinct mammals.",
    noun: "mammals",
    dataFile: "mammals.json",
    speciesFile: "mammals.species.json",
    sourceFallback: "ASM Mammal Diversity Database",
    sourceLink: { href: "https://www.mammaldiversity.org/", label: "MDD (leaves page)" },
    figcaption: "Interactive sunburst of the mammal taxonomy. Use Tab to reach arcs, Enter to zoom in, Escape to zoom out.",
    harvested: true
  },
  {
    id: "birds",
    folder: "Birds",
    label: "Birds",
    eyebrow: "Class",
    title: "Aves",
    lede: "A zoomable sunburst of living and recently extinct birds.",
    noun: "birds",
    dataFile: "birds.json",
    speciesFile: "birds.species.json",
    sourceFallback: "AviList: The Global Avian Checklist",
    sourceLink: { href: "https://www.avilist.org/", label: "AviList (leaves page)" },
    figcaption: "Interactive sunburst of the bird taxonomy. Use Tab to reach arcs, Enter to zoom in, Escape to zoom out.",
    harvested: true
  },
  {
    id: "fishes",
    folder: "Fishes",
    label: "Fishes",
    eyebrow: "Group",
    title: "Fishes",
    lede: "A zoomable sunburst of fishes from the GBIF Backbone.",
    noun: "fishes",
    dataFile: "fishes.json",
    speciesFile: "fishes.species.json",
    sourceFallback: "GBIF Backbone Taxonomy",
    sourceLink: { href: "https://www.gbif.org/", label: "GBIF (leaves page)" },
    figcaption: "Interactive sunburst of the fish taxonomy. Use Tab to reach arcs, Enter to zoom in, Escape to zoom out.",
    harvested: true
  },
  {
    id: "tree",
    folder: "Tree",
    label: "Tree",
    eyebrow: "Group",
    title: "Trees",
    lede: "A zoomable sunburst of the world’s tree species (GlobalTreeSearch).",
    noun: "trees",
    dataFile: "tree.json",
    speciesFile: "tree.species.json",
    sourceFallback: "BGCI GlobalTreeSearch",
    sourceLink: { href: "https://tools.bgci.org/global_tree_search.php", label: "GlobalTreeSearch (leaves page)" },
    figcaption: "Interactive sunburst of tree taxa. Use Tab to reach arcs, Enter to zoom in, Escape to zoom out.",
    harvested: true
  },
  {
    id: "bushes",
    folder: "Bushes",
    label: "Bushes",
    eyebrow: "Group",
    title: "Bushes",
    lede: "A zoomable sunburst of bushes (WCVP subshrubs).",
    noun: "bushes",
    dataFile: "bushes.json",
    speciesFile: "bushes.species.json",
    sourceFallback: "WCVP / Plants of the World Online (RBG Kew)",
    sourceLink: { href: "https://powo.science.kew.org/", label: "POWO (leaves page)" },
    figcaption: "Interactive sunburst of bush taxa. Use Tab to reach arcs, Enter to zoom in, Escape to zoom out.",
    harvested: true
  },
  {
    id: "shrubs",
    folder: "Shrubs",
    label: "Shrubs",
    eyebrow: "Group",
    title: "Shrubs",
    lede: "A zoomable sunburst of shrubs from the World Checklist of Vascular Plants.",
    noun: "shrubs",
    dataFile: "shrubs.json",
    speciesFile: "shrubs.species.json",
    sourceFallback: "WCVP / Plants of the World Online (RBG Kew)",
    sourceLink: { href: "https://powo.science.kew.org/", label: "POWO (leaves page)" },
    figcaption: "Interactive sunburst of shrub taxa. Use Tab to reach arcs, Enter to zoom in, Escape to zoom out.",
    harvested: true
  },
  {
    id: "flowers",
    folder: "Flowers",
    label: "Flowers",
    eyebrow: "Group",
    title: "Flowers",
    lede: "A zoomable sunburst of herbaceous flowering plants from the WCVP.",
    noun: "flowers",
    dataFile: "flowers.json",
    speciesFile: "flowers.species.json",
    sourceFallback: "WCVP / Plants of the World Online (RBG Kew)",
    sourceLink: { href: "https://powo.science.kew.org/", label: "POWO (leaves page)" },
    figcaption: "Interactive sunburst of flower taxa. Use Tab to reach arcs, Enter to zoom in, Escape to zoom out.",
    harvested: true
  },
  {
    id: "amphibians",
    folder: "Amphibians",
    label: "Amphibians",
    eyebrow: "Class",
    title: "Amphibia",
    lede: "A zoomable sunburst of living and recently extinct amphibians.",
    noun: "amphibians",
    dataFile: "amphibians.json",
    speciesFile: "amphibians.species.json",
    sourceFallback: "AmphibiaWeb",
    sourceLink: { href: "https://amphibiaweb.org/", label: "AmphibiaWeb (leaves page)" },
    figcaption: "Interactive sunburst of the amphibian taxonomy. Use Tab to reach arcs, Enter to zoom in, Escape to zoom out.",
    harvested: true
  },
  {
    id: "insects",
    folder: "Insects",
    label: "Insects",
    eyebrow: "Class",
    title: "Insecta",
    lede: "A zoomable sunburst of insect orders and families (GBIF species counts).",
    noun: "insects",
    dataFile: "insects.json",
    speciesFile: "insects.species.json",
    sourceFallback: "GBIF Backbone Taxonomy",
    sourceLink: { href: "https://www.gbif.org/", label: "GBIF (leaves page)" },
    figcaption: "Interactive sunburst of the insect taxonomy. Use Tab to reach arcs, Enter to zoom in, Escape to zoom out.",
    harvested: true
  }
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryById(id) {
  return byId.get(id) || null;
}

export function parseGroup(search = "", fallback = "mammals") {
  const id = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("group");
  return categoryById(id) ? id : fallback;
}

export function groupHref(id) {
  const params = new URLSearchParams(location.search);
  params.set("group", id);
  return `?${params.toString()}`;
}

export function tokenHref(category) {
  return `${category.folder}/styles/tokens.css`;
}

export function dataHref(category, file) {
  return `${category.folder}/data/${file}`;
}

export function assetHref(category, file) {
  if (!file) return file;
  if (/^(https?:)?\/\//i.test(file) || file.startsWith("/")) return file;
  return `${category.folder}/${file}`.replace(/\\/g, "/");
}

export function rebaseCredits(credits, category) {
  const out = {};
  for (const [name, credit] of Object.entries(credits || {})) {
    out[name] = {
      ...credit,
      file: assetHref(category, credit.file),
      file2x: assetHref(category, credit.file2x)
    };
  }
  return out;
}
