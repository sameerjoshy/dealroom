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

## Status
Demo build. Engine runs on the seeded store (`apps/api/src/seed.ts`, relative dates).
**Agents landed:** `deal-room` (brief + risks), `qualifier` (MEDDIC), `sniper` (email/asset
drafts on play steps), `extractor` (diagnose intake + debrief) — DeepSeek behind a provider
interface (`src/lib/llm.ts`), with a rule-only fallback when no key. Evals: `npm run eval`.
**Not yet wired:** Supabase `dr_` store (`migrations/`), HubSpot pull/write-back, deploy.
