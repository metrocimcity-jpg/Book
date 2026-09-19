# Mammal Family Tree (D3)

Interactive phylogenetic tree of **all major mammal clades** — monotremes, marsupials, and placental superorders (Xenarthra, Afrotheria, Euarchontoglires, Laurasiatheria) with representative orders, families, and species.

## Run locally

Static ES modules require a local server (browsers block `fetch` on `file://`):

```bash
cd /workspace
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Interaction

- **Zoom**: scroll wheel or pinch
- **Pan**: drag the background
- **Nodes**: drag to adjust layout; click for species/clade details
- **Reset view**: toolbar button

## Stack

- [D3.js v7](https://d3js.org/) (CDN)
- `data/mammals.json` — taxonomy + Wikimedia image URLs
- No build step

## Images

Species thumbnails are loaded from Wikimedia Commons; attribution appears in the detail panel when you click a node.
