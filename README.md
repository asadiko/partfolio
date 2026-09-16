# asadiko.github.io

Personal portfolio. The home page is a 3D room with a procedurally modelled iMac G3 (three.js); turning it on boots "AsadOS", a late-90s-style desktop where four interactive, fixture-driven case studies (a batched LLM pipeline, citation-grounded retrieval, a failure-mode playground, an escrow-ledger walkthrough), a journey map, about and contact run as windows. The same content exists as plain pages (`/work/*`, `/journey`, `/about`, `/contact`) — the fallback when WebGL is unavailable or motion is reduced, and what search engines index. Fully static — no backend, no API keys, no tracking.

## Stack

Astro 7 (static output) · React 19 islands · three.js (home page only, loaded lazily) · TypeScript strict · Tailwind v4 · zod-validated fixtures · Vitest · Playwright smoke test · ESLint (jsx-a11y strict) + Prettier · Docker for every workflow.

## Run it (Docker only)

```bash
docker compose up --build dev          # http://localhost:4321 — hot reload, bind-mounted source
docker compose run --rm --build test   # astro check + eslint + prettier --check + vitest
docker compose up --build preview      # http://localhost:8080/partfolio/ — production build behind nginx, same base path as GitHub Pages
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
  content/           MDX/Markdown — case studies, journey milestones, about, (empty) blog
  engines/           pure simulation logic with tests: pipeline cost model, grounding, scenarios
  scene/             three.js: office room (iMac model, props, lighting), CRT painter, globe, tween scheduler
  assets/            land-110m.json — Natural Earth coastlines (public domain), painted onto the globe at runtime
  os/                AsadOS: window-manager reducer (tested), menu bar, windows, apps, terminal parser (tested)
  islands/           React islands (hydrated on visibility) + the shared SVG Diagram; Desk.tsx runs the home page
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

Content pages ship no JavaScript except the theme toggle; islands load when scrolled into view. The home page renders its HTML first and fades the WebGL canvas in; three.js (≈140 KB gzipped) is imported only there and only on the client. All demos are keyboard-operable; diagrams expose nodes as buttons and edges as labelled images. `prefers-reduced-motion` disables streaming and animation. Light/dark follow the system with a per-load toggle (nothing is persisted).

## Deploy (GitHub Pages)

Every push to `main` runs `.github/workflows/deploy.yml`: verify → build → publish to GitHub Pages at
`https://asadiko.github.io/partfolio/`. The repository's Pages source must be **GitHub Actions**
(Settings → Pages → Source).

The site is built with `base: /partfolio` (see `astro.config.ts`); every internal link goes through
`withBase()` from `src/site.ts`. To serve from the root instead, rename the repository to
`asadiko.github.io` and build with `SITE_BASE=/`.
