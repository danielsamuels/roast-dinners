# Project Memory

## Status: All 10 Phases Complete ✅

**Repo:** github.com/danielsamuels/roast-dinners
**Live:** Cloudflare Pages (connected to main branch, auto-deploys)
**Stack:** React 19 + TypeScript 6 + Vite 8, shadcn/ui, Tailwind CSS v4, vite-plugin-pwa
**Tests:** 41 passing (vitest) — scaling engine (23) + scheduler (18)
**Build:** Code-split via React.lazy, 311KB main chunk + lazy-loaded route chunks

## Architecture

- **Recipe data** — JSON files in `data/`, baked into static build via `src/data/index.ts`
- **Step-graph model** — Recipes are arrays of steps with `dependsOn` dependencies, `resource` (oven/hob/none), and `ovenTempCelsius`
- **Backward scheduler** — `src/lib/scheduler.ts` — topological sort + oven conflict resolution, schedules from serving time backwards
- **Breakpoint scaling** — `src/lib/scaling.ts` — discrete ingredients (eggs, etc.) have breakpoint thresholds; grouped ingredients scale proportionally
- **Sharing** — Cloudflare Worker + KV in `worker/` directory, 30-day TTL, 8-char plan IDs
- **PWA** — Service worker via vite-plugin-pwa, offline SPA routing fallback

## Key Files

| File | Purpose |
|---|---|
| `PRD.md` | Product requirements — source of truth for features and scope |
| `src/types/recipe.ts` | All TypeScript types (MeatCut, Side, RecipeStep, MealConfig, etc.) |
| `src/lib/scheduler.ts` | Core scheduling algorithm |
| `src/lib/scaling.ts` | Ingredient scaling engine with breakpoint support |
| `src/data/index.ts` | Typed data loader — imports all JSON and exports accessors |
| `data/ingredients.json` | Normalised ingredient catalogue (60+ entries) |
| `src/hooks/useMealConfig.tsx` | React context for meal config with localStorage persistence |
| `src/hooks/useCookingSession.ts` | Cooking session state management |
| `worker/src/index.ts` | Cloudflare Worker for plan sharing |
| `vite.config.ts` | Vite config with React, Tailwind, PWA plugins |

## Known Remaining Items

- **PWA icons** — 192×192 and 512×512 PNGs needed in `public/` (referenced in manifest but not created)
- **Worker deployment** — `worker/wrangler.toml` has placeholder KV namespace IDs. Create namespace and deploy manually.
- **Cloudflare Web Analytics** — not yet added
- **Recipe accuracy** — cooking times/instructions need human validation
- **Mobile/device testing** — not done on real devices yet

## Gotchas

- `.npmrc` has `legacy-peer-deps=true` — required because vite-plugin-pwa v1.2.0 doesn't support Vite 8 peer deps
- TypeScript 6 needs `"ignoreDeprecations": "6.0"` in `tsconfig.app.json` for baseUrl/paths
- shadcn/ui init requires path aliases in the ROOT `tsconfig.json`, not just `tsconfig.app.json`
- `allowConstantExport: true` in ESLint config to suppress react-refresh warnings from shadcn exports like `buttonVariants`

## User Flow

`/` (Setup) → `/configure` → `/shopping` → `/review` → `/cook` → `/done`

Shared plans: `/shared/:planId` — loads config from Worker KV and hydrates the app.
