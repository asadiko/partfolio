# partfolio

Portfolio of Asadulla Ravshanbekov, machine learning engineer (LLM systems, production AI, backends).
Live at **https://asadiko.github.io/partfolio/**.

## What it is

The home page is a 3D office with an iMac G3 built from primitives in three.js. Turning it on boots
**AsadOS**, a late-90s-style desktop rendered as real DOM. Its apps are the portfolio:

| App       | What it shows                                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline  | A 17-stage LLM document pipeline as a workflow graph; toggle naive vs. batched design and watch calls, latency and cost change                        |
| Grounding | Retrieval + citation check on RFC 9110 passages; switch the check off to see unsupported claims survive                                               |
| Failures  | Inject malformed output, timeouts, cancellation, provider outage or a proxy idle-kill into a client → gateway → model topology and watch the recovery |
| Ledger    | Guided walkthrough of an escrow wallet: append-only ledger, outbox, verified webhooks, daily zero-delta invariant                                     |
| Journey   | A globe with the route Tashkent → Riga → Munich and the milestones along it                                                                           |
| Terminal  | `help`, `ls ~/work`, `open <app>` — a keyboard-only way to everything                                                                                 |

Every demo runs on fixture data in `fixtures/`. Nothing calls a model or a server; each demo says so.
The same content exists as plain pages (`/work/*`, `/journey`, `/about`, `/contact`) for search engines
and for browsers without WebGL or with reduced motion.

## Stack

- **Astro 7**, static output, MDX content collections, sitemap
- **React 19** islands for the interactive parts, hydrated on visibility
- **three.js** for the office room and the globe — procedural geometry, `RoomEnvironment` lighting,
  Natural Earth coastlines (public domain, 20 KB) painted onto the globe at runtime
- **TypeScript** strict, **Tailwind v4**, **zod**-validated fixtures
- **Vitest** for the engines and reducers, **Playwright** smoke test in its own container
- **ESLint** (typescript-eslint, jsx-a11y strict, react-hooks) and **Prettier**
- **Docker** for every workflow; **GitHub Actions** for CI and Pages deploy

## Run

```bash
docker compose up --build dev          # http://localhost:4321/partfolio/  hot reload
docker compose run --rm --build test   # astro check · eslint · prettier · vitest
docker compose up --build preview      # http://localhost:8080/partfolio/  production build behind nginx
docker compose run --rm --build e2e    # Playwright: every route × 3 viewports, every demo, boot → desktop → shutdown
```

Nothing is installed on the host. After changing dependencies: `docker compose up --build -V dev`.
To edit the lockfile without host Node: `docker run --rm -v "$PWD":/app -w /app node:22-alpine npm install --package-lock-only <pkg>`.

## Layout

```
fixtures/          demo data (pipeline graph + cost model, RFC corpus, failure scenarios, escrow tour)
src/content/       MDX — case studies, journey milestones, about, blog (empty)
src/engines/       pure, tested simulation logic: pipeline cost model, grounding, scenarios
src/os/            AsadOS: window-manager reducer, menu bar, windows, apps, terminal parser
src/scene/         three.js: office + iMac, CRT painter, globe, tween scheduler
src/islands/       React islands; Desk.tsx runs the home page (room → boot → desktop → shutdown)
src/lib/           zod schemas, fixture loaders, formatting, cx, reduced-motion hook
e2e/               Playwright smoke test
docker/nginx.conf  preview server
```

## Editing content

- Case studies: `src/content/case-studies/*.mdx` — frontmatter picks the demo and headline numbers;
  body follows problem → first attempt → what worked → the number that moved.
- Journey: one file per milestone in `src/content/journey/`.
- Site constants (name, links, tagline): `src/site.ts`. Internal links go through `withBase()`.
- `<AuthorNote>` callouts mark text only the author can write. Remove before publishing.

## Deploy

Push to `main` → `.github/workflows/deploy.yml` verifies, builds and publishes to GitHub Pages.
The repository's Pages source must be **GitHub Actions** (Settings → Pages). The site is built with
`base: /partfolio`; to serve from the root, rename the repo to `asadiko.github.io` and build with `SITE_BASE=/`.
