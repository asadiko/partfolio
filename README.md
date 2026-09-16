# asadiko.github.io

Personal portfolio: four interactive, fixture-driven case studies (a batched LLM pipeline, citation-grounded retrieval, a failure-mode playground, an escrow-ledger walkthrough) and a journey map. Fully static — no backend, no API keys, no tracking.

## Stack

Astro 5 (static output) · React 19 islands for the interactive pieces · TypeScript strict · Tailwind v4 · Zod-validated fixtures · Vitest · ESLint + Prettier · Docker for every workflow.

## Run it (Docker only)

```bash
docker compose up --build dev          # http://localhost:4321 — hot reload, bind-mounted source
docker compose run --rm --build test   # astro check + eslint + prettier --check + vitest
docker compose up --build preview      # http://localhost:8080 — production build behind nginx (read-only, non-root)
docker compose run --rm --build e2e    # Playwright smoke test against the preview: routes, viewports, every demo
```

Nothing needs to be installed on the host. After changing dependencies, recreate the dev container so its
`node_modules` volume is refreshed: `docker compose up --build -V dev`. To change the lockfile without a host
Node: `docker run --rm -v "$PWD":/app -w /app node:22-alpine npm install --package-lock-only <pkg>`.

## Layout

```
fixtures/            demo data — extend these to change what the demos show
  pipeline.json      document profile, cost model, stage catalogue (naive vs batched call rules)
  grounding.json     RFC 9110 passages, canned questions, drafts and corrective retries
  playground.json    LLM-pipeline topology (nodes, edges, cards) and scenario copy
  escrow.json        escrow-wallet topology and the guided-tour steps
src/
  content/           MDX/Markdown — case studies, journey milestones, (empty) blog
  engines/           pure simulation logic with tests: pipeline cost model, grounding, scenarios
  islands/           React islands (hydrated on visibility) + the shared SVG Diagram
  components/        Astro components (no client JS)
  pages/             routes
  lib/               Zod schemas, fixture loaders, formatting, reduced-motion hook
docker/nginx.conf    preview server config
e2e/                 Playwright smoke test (runs in its own container against the preview)
```

Fixtures are parsed with Zod at import time, so a malformed fixture fails the build rather than the page.

## Editing content

- Case studies: `src/content/case-studies/*.mdx`. Frontmatter picks the demo (`demo: pipeline | grounding | playground | escrow`) and the headline numbers. Body follows problem → first attempt → what worked → the number that moved.
- Journey: one Markdown file per milestone in `src/content/journey/`, ordered by `order`.
- Blog: drop `.mdx` files into `src/content/blog/`; the list at `/blog` and the post pages already exist. Add a nav link in `src/site.ts` when there is something to read.
- Site-wide constants (name, links, tagline): `src/site.ts`.
- `<AuthorNote>` callouts mark text only the author can write. Remove them before deploying.

## Accessibility and performance

No JavaScript on content pages except the theme toggle; islands load when scrolled into view. All demos are keyboard-operable; diagrams expose nodes as buttons and edges as labelled images. `prefers-reduced-motion` disables streaming and animation. Light/dark follow the system with a per-load toggle (nothing is persisted).

## Deploy (GitHub Pages)

The workflow in `.github/workflows/deploy.yml` builds and publishes to GitHub Pages, but it is **manual-trigger only** until the site is approved:

1. Push the repository to `github.com/asadiko/asadiko.github.io`.
2. Repository → Settings → Pages → Source: **GitHub Actions**.
3. Actions → "Deploy to GitHub Pages" → Run workflow.

To deploy on every push, change the trigger in `deploy.yml` to `on: push: branches: [main]`. `ci.yml` already runs the full verify + build on pushes and pull requests.
