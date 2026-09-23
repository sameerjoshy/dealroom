# Deal Room — repo handoff

**Product:** the seller's deal record + an agentic loop: **Diagnose → Prescribe → Execute → Verify.**
**Spec:** `docs/SPEC.md` (v0.2.2) · **Taxonomy:** `docs/APP_VS_AGENT.md` · **Market:** `docs/MARKET_RESEARCH.md`.

## Layout
```
apps/app   React + Vite + Tailwind  (base '/deal-room/')
apps/api   Cloudflare Worker        (routes, rules, plays, agents)
packages/contracts   shared types + zod schemas + stall/play catalogue
migrations/          dr_* schema (Supabase, shared project, dr_ prefix)
scripts/             sync-registry (agent registry snapshot + drift gate)
docs/                SPEC.md · CLAUDE_REVIEW.md · APP_VS_AGENT.md · MARKET_RESEARCH.md
```

## Principles (northstars)
- One record, two projections. One flow. No duplication.
- **Triangulate, then commit** — never refuse to diagnose; report coverage as confidence.
- Rules decide stalls; the LLM extracts facts, explains, drafts. The LLM never outputs a stall ID.
- Nothing customer-facing is sent without human approval. Everything is audited.
- High quality, error-free. Verify builds. Never commit secrets.

## Commands
```
npm install
npm run dev:api      # wrangler dev (Worker)  → http://localhost:8787
npm run dev:app      # vite (app)             → http://localhost:5175/deal-room/
npm run dev:hub      # apps hub router
npm run eval         # engine eval against a running Worker
npm run typecheck    # api + hub typecheck, app build
```

## Status — deployed
- **Engine:** stall taxonomy + play loop, seeded fixtures (`apps/api/src/seed.ts`, relative dates).
- **Agents:** `deal-room`, `qualifier`, `sniper`, `extractor` (DeepSeek behind `src/lib/llm.ts`; rule-only fallback without a key).
- **Store:** `Repo` layer (`src/repo.ts`) — **SupabaseRepo** (dr_ tables, PostgREST) when `SUPABASE_*` is set, else **MemoryRepo**. Migration applied.
- **HubSpot:** pull deals + contacts + close-date history (`/api/hubspot/sync`); write-back Notes + Tasks on approve.
- **Deployed (Workers):** `dealroom-api`, `dealroom-app` (static assets), `apps-hub` (router + launcher) at `apps-hub.sameerjoshy.workers.dev`.
- ⏳ **Pending (dashboard):** point `apps.gtm-360.com` at `apps-hub` — the deploy token lacks DNS + Workers-Routes write. Add a proxied record + route `apps.gtm-360.com/*` → `apps-hub` in the Cloudflare dashboard.

## Deploy
```
npm run typecheck && npm run build
(cd apps/api   && npx wrangler deploy)          # + wrangler secret bulk (DEEPSEEK/HUBSPOT/SUPABASE_*)
(cd apps/app   && npx wrangler deploy)          # static assets
(cd apps-hub   && npx wrangler deploy)          # router + launcher
node scripts/apply-migration.mjs migrations/001_dr_init.sql
```
