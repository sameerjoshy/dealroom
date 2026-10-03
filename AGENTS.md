# Deal Room — repo handoff

**Product:** the seller's deal record + an agentic loop: **Diagnose → Prescribe → Execute → Verify.**
**Spec:** `docs/SPEC.md` (v0.2.2) · **Taxonomy:** `docs/APP_VS_AGENT.md` · **Market:** `docs/MARKET_RESEARCH.md`.

## Layout
```
apps/app   React + Vite + Tailwind  (base '/deal-room/')
apps/api   Cloudflare Worker        (routes, rules, plays, agents)
packages/contracts   shared types + zod schemas + stall/play catalogue
migrations/          dr_* schema (001 init · 002 RLS policies)
scripts/             apply-migration · sql · eval.mjs (engine eval + drift gate)
qa/                  qa.mjs (route crawl + links) · a11y.mjs (axe)
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
- **HubSpot:** pull deals + contacts + close-date history, **and logged engagements (emails/calls/meetings)** (`pullEngagements` → `dr_activities`, inbound email refreshes `last_two_way_at`); write-back Notes + Tasks on approve. `POST /api/hubspot/sync` (pass `{ "engagements": false }` to skip).
- **Manager:** pipeline by stall · play performance (rates hidden < 5 runs) · **rep patterns vs team median** · **dismiss reasons per stall rule** · **forecast flags** (S6 + in-quarter).
- **Hardening:** structured JSON request logging + request ids (`src/lib/obs.ts`), a top-level error boundary (unknown routes never throw HTML), and an **opt-in auth gate** (`src/lib/auth.ts` — HS256 JWT via `GTM360_SSO_SECRET` or `x-dealroom-key`; active only when `REQUIRE_AUTH=true`).
- **RLS:** `migrations/002_dr_rls.sql` — workspace-membership policies (`auth.uid()` → `dr_workspace_members`) on the deal-scoped tables.
- **Deployed (Workers):** `dealroom-api`, `dealroom-app` (static assets), `apps-hub` (router + launcher) — live behind `apps.gtm-360.com`.
- ✅ `apps.gtm-360.com` is live (Pages domain proxy → `apps-hub` Worker).

## Env vars (Worker `dealroom-api`)
`DEEPSEEK_API_KEY` · `HUBSPOT_API_KEY` · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` ·
`REQUIRE_AUTH` (`true` to enforce) · `GTM360_SSO_SECRET` · `DEALROOM_API_KEY` (machine callers).

## Deploy
```
npm run typecheck && npm run build
(cd apps/api   && npx wrangler deploy)          # + wrangler secret bulk (DEEPSEEK/HUBSPOT/SUPABASE_*)
(cd apps/app   && npx wrangler deploy)          # static assets
(cd apps-hub   && npx wrangler deploy)          # router + launcher
node scripts/apply-migration.mjs migrations/001_dr_init.sql
node scripts/apply-migration.mjs migrations/002_dr_rls.sql
```

## Verify
```
node scripts/eval.mjs http://localhost:8787   # engine + manager + hardening (24 checks)
PLAYWRIGHT_PATH=<dir> node qa/qa.mjs            # live route crawl + link integrity
PLAYWRIGHT_PATH=<dir> node qa/a11y.mjs          # axe WCAG A/AA
```
