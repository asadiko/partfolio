# Portfolio site — design spec

Date: 2026-09-16. Owner: Asadulla Ravshanbekov. Target: `asadiko.github.io` (deploy only on explicit go-ahead).

## Goal

A static portfolio where an engineering manager or senior engineer at an AI/ML company can *interact* with
the systems the author has built — pipeline explorer, grounding demo, failure-mode playground, architecture
walkthrough — and a journey map (Tashkent → Riga → Munich). Ninety seconds to earn a second look.

## Hard constraints

1. Zero running cost: fully static output, GitHub Pages. No backend, database, or server functions.
2. No paid APIs, no keys. Every "live" demo runs on fixtures in `/fixtures/*.json` bundled at build time,
   with simulated latency and streaming. Each demo shows a "Simulated — runs on fixture data" badge.
3. Confidentiality: no client names, internal service names, real prompts, or real documents. Employer
   work is described as patterns on a neutral domain (public IETF RFCs). Employer may be named as
   "Semorai GmbH — software company with automotive and manufacturing enterprise clients" (already public on CV).
   Olber security work: patterns only (audit, pentest, remediation counts), no vulnerability specifics.
4. Fast and accessible: <1s first paint, mobile, keyboard navigable, `prefers-reduced-motion`,
   light and dark themes. No localStorage-dependent behaviour (theme toggle is per-load only).
5. Local development and build run entirely in Docker.

## Stack

- Astro 5, `output: 'static'`, `site: https://asadiko.github.io`, root base path.
- React 19 islands only for the four interactive pieces, hydrated `client:visible`.
- TypeScript strict. Tailwind v4 via `@tailwindcss/vite`. No component library.
- Content: Astro content collections with MDX (`case-studies`, `journey`, `blog` — blog is wired but has no
  entries and no nav link).
- Fixtures: `/fixtures/*.json`, validated by Zod schemas in `src/lib/fixtures.ts` at import time.
- Diagrams: inline SVG rendered by a shared `Diagram` React component from a declarative node/edge model.
- Tests: Vitest for the pure simulation engines; `astro check` for types; both run in the Docker image.
- Tooling: ESLint (typescript-eslint, jsx-a11y), Prettier. Node 22 LTS in containers.

## Site map

| Route | Content |
|---|---|
| `/` | Name, one-line positioning, four demo entry cards, "now" strip, contact links. Zero JS except theme toggle. |
| `/work/batched-pipeline` | Case study 1 + Pipeline explorer island. |
| `/work/grounded-answers` | Case study 2 + Retrieval & grounding island. |
| `/work/long-running-streams` | Case study 3 + Failure-mode playground island (clickable architecture diagram). |
| `/work/escrow-ledger` | Case study 4 (Olber) + animated architecture walkthrough (Diagram island, no injection). |
| `/journey` | Journey map island (SVG route + milestone timeline). |
| `/about` | Prose + evidenced skill groups. |
| `/contact` | Email, LinkedIn, GitHub, CV PDF slot. |

Every case study MDX follows: problem (two sentences) → first attempt and why it failed → what worked →
the number that moved. Plain language; no marketing adjectives.

## Interactive pieces

### Pipeline explorer (`src/islands/pipeline/`)
Input: fixture describing a sample RFC (page count, requirement count, standards-code count) and a stage
list. Engine `simulatePipeline(doc, design: 'naive' | 'batched')` returns per-stage call counts, estimated
latency, and relative cost from a documented cost model (per-item calls × items vs. `ceil(items / batch)`).
UI: stages light up sequentially (instant under reduced motion); clicking a stage opens a panel with
"what it does / why it exists / what it guards against"; a design toggle re-runs the model and animates
counters. Numbers labelled as an illustrative model, not production measurements.

### Retrieval & grounding (`src/islands/grounding/`)
Fixture: corpus chunks from RFC text (id, source, section, text), canned questions with retrieval scores per
chunk, and a draft answer as a list of claims each with `sourceIds`. Engine `groundAnswer(draft, retrieved,
{ enforce })`: a claim is supported iff every cited source is in the retrieved set; unsupported claims are
stripped; if any were stripped, one corrective retry (fixture supplies the retry draft); with `enforce:
false` the draft passes through with unsupported claims flagged for display. UI: question picker or free
text (matched to nearest canned question by token overlap), ranked evidence list animates in, answer
streams token by token, unsupported claims are struck through (enforced) or highlighted (unenforced).

### Failure-mode playground (`src/islands/playground/`)
Diagram model: client → gateway (admission control, circuit breaker, load balancer) → extraction service
→ model endpoints A/B/C; a proxy sits between client and gateway. Engine: a deterministic state machine
`runScenario(scenario)` producing an ordered list of events `{ at, node | edge, kind, message }`.
Scenarios: `malformed-output`, `endpoint-timeout`, `client-cancel`, `provider-outage`, `proxy-idle-kill`,
plus `happy-path`. UI: scenario buttons, the diagram animates each event (edge pulses, node status
badges), an event log fills in, and a "what guards this" note per scenario. Nodes are clickable
(job / failure mode guarded / trade-off) and edges show what flows on hover or focus.

### Architecture walkthrough (`Diagram` reused, `src/islands/diagram/`)
Declarative `DiagramSpec` (nodes with position, label, card; edges with label). Used by the playground and by
the Olber escrow page, where an autoplay tour steps through the nodes (pauses under reduced motion; always
step-able by keyboard).

### Journey map (`src/islands/journey/`)
Hand-drawn simplified SVG route with three city markers and milestones from the `journey` collection. Scroll
or arrow keys move the active milestone; the route segment to the active city is highlighted. No map tiles.

## Content decisions

- Helicopter: "built a working helicopter prototype at 15" — anecdote wording, no adoption claim.
- Journey milestones: school (Tashkent), RTU Sept 2022, 2find Nov 2022 (first semester), Raccoons 2022 win,
  START Hack 2023, Raccoons 2023, Semorai June 2023, Junction 2023, Junction 2024, Olber Aug 2025, WAYU,
  UzHack 2026, BSc Jan 2026, Munich.
- Numbers used only where the notes evidence them: 219 releases, ~half of commits, 6/10 → 9/10 with a
  7-variant ablation, 71-page document with 212 codes, 21k test lines / ~1,000 cases, 212 migrations /
  115 pgTAP files, 10,000+ registered users, 37-finding audit / 13 migrations. Pipeline call counts are an
  illustrative model. CS2 and CS3 "number that moved" are left as clearly marked author-fill prompts.

## Docker

- `Dockerfile` multi-stage: `deps` → `dev` (astro dev on 0.0.0.0:4321) → `build` → `preview` (nginx
  serving `dist/`, non-root, read-only).
- `compose.yaml` services: `dev` (bind mount, hot reload), `preview` (production build behind nginx on
  :8080), `test` (vitest + astro check + lint).
- README: `docker compose up dev`, `docker compose up preview`, `docker compose run --rm test`; deploy
  section documents the GitHub Actions workflow but the workflow is committed disabled (manual trigger only)
  until the owner says go.

## Out of scope

Blog posts, analytics, forms, 3D/WebGL, any network call at runtime, i18n.
