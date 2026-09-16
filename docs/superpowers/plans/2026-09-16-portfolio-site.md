# Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static Astro portfolio with four interactive fixture-driven demos, a journey map, and Docker-only local dev/preview/test.

**Architecture:** Astro static site; content in MDX collections; four React islands each split into a pure TypeScript engine (tested) and a thin UI; one shared SVG `Diagram` component; fixtures validated with Zod at build time.

**Tech Stack:** Astro 5, React 19, TypeScript strict, Tailwind v4, Zod, Vitest, ESLint + Prettier, Docker (Node 22 / nginx).

**Spec:** `docs/superpowers/specs/2026-09-16-portfolio-site-design.md`

## Global Constraints

- Static output only; `site: 'https://asadiko.github.io'`; no runtime network calls.
- No API keys; all demo data in `/fixtures/*.json`; every demo shows "Simulated — runs on fixture data".
- No client names, internal service names, real prompts or documents. Employer line: "Semorai GmbH — software company with automotive and manufacturing enterprise clients".
- No localStorage/sessionStorage. Theme toggle is per-load.
- `prefers-reduced-motion`: no streaming/animation; state changes are instant.
- All dev, build, and test commands run in Docker.
- Deploy workflow committed with `workflow_dispatch` only; no push trigger until the owner says go.
- Comments only where the _why_ is non-obvious.

---

## File structure

```
portfolio/
  Dockerfile                      multi-stage: deps → dev → build → preview(nginx)
  compose.yaml                    dev / preview / test services
  docker/nginx.conf               static, gzip, cache headers, security headers
  astro.config.ts, tsconfig.json, package.json, vitest.config.ts, eslint.config.js, .prettierrc
  fixtures/
    pipeline.json                 sample RFC doc profile + stage catalogue
    grounding.json                RFC chunks, canned questions, drafts, retries
    playground.json               diagram spec + scenario copy
    escrow.json                   Olber diagram spec + tour order
  src/
    lib/fixtures.ts               Zod schemas + typed loaders
    lib/motion.ts                 usePrefersReducedMotion
    lib/format.ts                 number/latency/cost formatting
    engines/pipeline.ts           simulatePipeline
    engines/grounding.ts          groundAnswer, matchQuestion
    engines/playground.ts         runScenario
    engines/*.test.ts
    components/                   .astro: Header, Footer, ThemeToggle, SimBadge, CaseStudyLayout, Prose
    islands/diagram/Diagram.tsx   shared SVG diagram (nodes, edges, cards, hover/focus)
    islands/pipeline/PipelineExplorer.tsx
    islands/grounding/GroundingDemo.tsx
    islands/playground/FailurePlayground.tsx
    islands/escrow/EscrowTour.tsx
    islands/journey/JourneyMap.tsx
    content.config.ts             collections: caseStudies, journey, blog
    content/case-studies/*.mdx    4 entries
    content/journey/*.md          milestones
    pages/ index, about, contact, journey, work/[slug].astro, blog/index (hidden)
  .github/workflows/deploy.yml    workflow_dispatch only
  README.md
```

## Tasks

### Task 1: Scaffold + Docker

Files: package.json, astro.config.ts, tsconfig.json, Dockerfile, compose.yaml, docker/nginx.conf, .dockerignore, .gitignore, src/styles/global.css, src/layouts/Base.astro, src/pages/index.astro (placeholder).

- [ ] `npm create astro` equivalent by hand (minimal deps), Tailwind v4 via vite plugin, React integration, MDX integration.
- [ ] Dockerfile stages; compose services `dev` (:4321, bind mount, anonymous volume for node_modules), `preview` (:8080), `test`.
- [ ] Verify: `docker compose up -d dev` serves placeholder; `docker compose run --rm test` runs `astro check` + vitest + eslint.
- [ ] Commit.

### Task 2: Fixture schemas + loaders

Produces: `loadPipelineFixture(): PipelineFixture`, `loadGroundingFixture()`, `loadPlaygroundFixture()`, `loadEscrowFixture()`; Zod schemas exported for reuse. Tests: invalid fixture throws; valid fixtures parse.

### Task 3: Pipeline engine (TDD)

`simulatePipeline(doc: DocProfile, stages: StageSpec[], design: Design): PipelineResult`

- `DocProfile { pages, requirements, standardsCodes, languages }`
- `StageSpec { id, name, purpose, why, guards, naive: CallRule, batched: CallRule }`
- `CallRule = { per: 'doc'|'page'|'requirement'|'code'|'language'; calls?: number; batch?: number; model: 'cheap'|'strong' }`
- `PipelineResult { stages: StageResult[]; totals: { calls, latencyMs, costUnits } }`
  Tests: per-requirement × N; batched uses ceil; zero-call stage; totals sum; naive ≥ batched for the fixture.

### Task 4: Grounding engine (TDD)

`groundAnswer(draft: Claim[], retrievedIds: Set<string>, retry: Claim[] | undefined, opts: { enforce: boolean }): GroundingResult`

- `Claim { id, text, sourceIds: string[] }`
- `GroundingResult { claims: GradedClaim[]; retried: boolean; stripped: number }`, `GradedClaim = Claim & { status: 'supported'|'stripped'|'unsupported' }`
  Tests: all supported → unchanged; unsupported stripped and retry used once; enforce false → unsupported flagged, no retry; empty sources = unsupported.
  `matchQuestion(input: string, questions: {id, text}[]): string | undefined` — token-overlap Jaccard, threshold 0.2.

### Task 5: Playground engine (TDD)

`runScenario(id: ScenarioId, spec: PlaygroundFixture): ScenarioEvent[]`

- `ScenarioEvent { at: number; target: { node: string } | { edge: string }; kind: 'ok'|'warn'|'fail'|'recover'|'info'; message: string }`
  Tests: every scenario ends with `recover` or `ok` on the client node; timestamps monotonic; all targets exist in the diagram spec; happy path has no `fail`.

### Task 6: Diagram component

`DiagramSpec { nodes: DiagramNode[]; edges: DiagramEdge[]; width; height }`, `DiagramNode { id, label, x, y, w, h, card: { job, guards, tradeoff } }`, `DiagramEdge { id, from, to, label, flow }`.
Props: `spec`, `status?: Record<nodeId, 'idle'|'ok'|'warn'|'fail'|'recover'>`, `activeEdge?`, `selected?`, `onSelect`. Keyboard: nodes are `<button>` inside `<foreignObject>`-free SVG using `role="button"` + tabIndex + Enter/Space; edges expose `<title>`.

### Task 7: Islands (Pipeline, Grounding, Playground, Escrow tour, Journey)

Each: reduced-motion aware, keyboard operable, SimBadge, aria-live log where events stream.

### Task 8: Content + pages

Four MDX case studies, journey milestones, about, contact, home; `work/[slug].astro` with CaseStudyLayout mapping slug → island.

### Task 9: README, deploy workflow (manual only), lint/format pass, Lighthouse-ish check via `astro build` size report.
