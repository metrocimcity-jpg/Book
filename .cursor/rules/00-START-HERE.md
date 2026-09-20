# Mammals Zoomable Sunburst — Cursor Prompt Pack

A multi-file prompt for **Cursor Desktop**. Each file is one prompt. Run them in order,
in the same chat (Agent mode, "Ask for confirmation on shell commands" on).

## How to use

1. Open your project root in Cursor.
2. Copy `cursor-rules.mdc` into `.cursor/rules/mammals.mdc` (or paste its body into
   `.cursorrules` if you prefer the legacy file).
3. In Agent mode, attach one prompt file at a time with `@` and say **"Execute this prompt."**
4. Do not skip ahead — each stage has a **Definition of done** the next stage depends on.

| Stage | File | Produces |
|---|---|---|
| 0 | `00-START-HERE.md` | this plan |
| 1 | `01-setup-and-structure.md` | `mammals/` scaffold, dev server |
| 2 | `02-data-pipeline.md` | `mammals/data/mammals.json` taxonomy tree |
| 3 | `03-image-harvesting.md` | `mammals/assets/img/**` + `credits.json` |
| 4 | `04-sunburst-d3.md` | working zoomable sunburst |
| 5 | `05-interaction-ui.md` | search, breadcrumbs, detail panel, a11y |
| 6 | `06-qa-acceptance.md` | tests, perf budget, README, sign-off |

## Project goal (read this into context once)

Build a self-contained, static, interactive **zoomable sunburst** of the full mammal
taxonomy, living in a `mammals/` subfolder of the current repository.

- Visual and interaction model: **D3 "Zoomable Sunburst"** by Mike Bostock
  (<https://observablehq.com/@d3/zoomable-sunburst>), ISC-licensed. Reimplement it as
  plain ES modules — do **not** import the Observable runtime.
- Hierarchy: `Mammalia → Order → Family → Genus → (Species)`.
- Every arc a user can focus on shows an **illustration** of that taxon in the centre disc
  and in the detail panel.
- **Images must be gathered, never generated.** No AI image generation of any kind.
  Prefer *illustrated* artwork (scientific plates, line drawings, vector silhouettes)
  over photographs; fall back to a photo only when no free illustration exists.
- Every image carries author + licence + source URL, surfaced in the UI and in
  `mammals/CREDITS.md`.

## Hard constraints

- No build step required to view: opening `mammals/index.html` through a local static
  server must work. A bundler is optional and must not become mandatory.
- D3 v7, vendored locally in `mammals/vendor/` — the page must render offline.
- No framework (no React/Vue). Vanilla ES modules + CSS.
- No tracking, no CDN calls at runtime, no external fonts at runtime.
- Data and image fetching happen **only** in Node scripts under `mammals/scripts/`,
  run manually, with results committed as static files.

## Ground rules for the agent

- Ask before installing any dependency that is not in the stage's stated list.
- Write files, then run the stage's verification command and paste real output.
  Never claim a stage is done from inspection alone.
- If a remote API's shape differs from what a prompt assumes, trust the live API,
  fix the script, and note the difference in `mammals/NOTES.md`.
- Keep functions small and commented where the maths is non-obvious (arc angles,
  interpolation on zoom).
