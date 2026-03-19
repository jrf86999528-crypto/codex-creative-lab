# Codex Creative Lab

A small browser-first playground of interactive experiments, led by `Painterverse`, a 3D constellation of painters across eras and cultures.

The repository currently ships several prototypes from the same workspace:

| Route / Folder | What it is |
| --- | --- |
| `/` | `Painterverse` — a Three.js painter universe with connected stars, mobile portrait layout, and artwork panels |
| `/stock` | `Stock Workbench` — a market dashboard with optional AI overlay |
| `/extinct-lab` | `Extinct Lab` — a separate visual experiment page |
| `panel-chat/` | a lightweight multi-provider chat panel |
| `design-workbench/` | a local design workbench app |

## Highlights

- 3D painter graph with draggable orbit controls, relation lines, culture filters, and mobile portrait support
- Local-first artwork loading with graceful fallback when an artwork cache is missing
- Optional artwork caching scripts for building your own local image set
- Tiny Python server for static delivery plus a few JSON endpoints used by the stock demo

## Quick Start

Requirements:

- Python 3.9+
- A modern desktop or mobile browser

Run locally:

```bash
python3 server.py
```

Then open:

- [http://127.0.0.1:4173/](http://127.0.0.1:4173/) for `Painterverse`
- [http://127.0.0.1:4173/stock](http://127.0.0.1:4173/stock) for `Stock Workbench`
- [http://127.0.0.1:4173/extinct-lab](http://127.0.0.1:4173/extinct-lab) for `Extinct Lab`

## Artwork Cache

`Painterverse` is designed to run even when no local artwork cache is present.

Fresh clones will not include `assets/artworks/` because downloaded artwork files can carry separate copyright and licensing constraints. On a clean checkout:

- the app still boots normally
- the local artwork manifest request falls back to an empty object
- artwork panels use remote lookup or placeholders when no local image exists

If you want to build your own local cache, start with:

```bash
python3 scripts/cache_painter_artworks.py --pending-limit 20
```

Useful supporting files:

- `tmp/artwork-targets.json` — artwork lookup targets used by the cache script
- `tmp/painters-runtime.json` — painter metadata used for cache enrichment
- `assets/artworks/manifest.json` — generated local cache manifest, ignored in Git by default

## Optional Environment Variables

Most of the repository works without secrets.

Optional variables used by specific demos:

- `OPENAI_API_KEY` — enables the AI overlay in `Stock Workbench`
- `OPENAI_BASE_URL` — custom OpenAI-compatible endpoint for the stock demo
- `STOCK_AI_MODEL` — overrides the default model used by the stock overlay
- provider-specific variables in `panel-chat/` and `design-workbench/`

If these variables are absent, the corresponding AI features stay disabled or fall back safely.

## Repository Layout

```text
.
├── index.html / styles.css / script.js      # Painterverse
├── stock.html / stock.css / stock.js        # Stock Workbench
├── extinct-lab.html / extinct-lab.css / extinct-lab.js
├── server.py                                # Local static + API server
├── assets/                                  # Shared static assets
├── scripts/                                 # Helpers, cache scripts, launchers
├── tmp/                                     # Source lists and local work files
├── panel-chat/                              # Chat panel app
└── design-workbench/                        # Design workbench app
```

## Open-Source Notes

- Code in this repository is released under the MIT License unless noted otherwise.
- Downloaded artwork images are intentionally excluded from version control.
- Third-party data, museum assets, fonts, and remote media remain subject to their original licenses and terms.

## Suggested First Publish Flow

```bash
git add .
git commit -m "Initial open-source release"
git remote add origin <your-github-repo-url>
git push -u origin main
```

If you only want to open-source `Painterverse`, you can also split the root page, shared assets, server, and cache scripts into a dedicated repository later.
