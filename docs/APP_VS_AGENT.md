# Agents vs Apps — the GTM-360 model

**Status:** adopted 2026-09-23

## The distinction

| | **Agent** | **App** |
|---|---|---|
| What | a *capability* — one job | a *product* — a job-to-be-done, end to end |
| Contract | inputs → GATHER·VALIDATE·SYNTHESISE·VERIFY → outputs → gates → handoffs | data model + workflows + UI + integrations |
| State | one-shot run (returns an artifact) | **ongoing state** (records persist) |
| Home | the registry (`@gtm360/agent-registry`), shared | its own repo, domain, data, users |
| Composition | standalone | **embeds many agents** |
| Sold? | no — a building block | yes — to a customer segment |

**Heuristic:** *answers a question once → agent. Has a workspace and ongoing state → app.*
Apps are where humans live; agents are what apps call.

## Surfaces

```
gtm-360.com                     marketing + /wiki (knowledge)
agents.gtm-360.com              Portal  — the agentic console (run any of the 41 agents)
apps.gtm-360.com                App hub (launcher + path router)
   ├─ /content-engine           Content Engine  (app)
   ├─ /deal-room                Deal Room       (app)
   └─ …                         future apps
```

- **Portal** = the agentic product. Run an agent, see the output. No app data.
- **Apps** = full, independent, untangled standalone products. `apps` is a naming convention + a hub — a separate product from the Portal.
- **Login:** one GTM-360 SSO across `agents.` and `apps.`

## Plumbing

- `apps.gtm-360.com` is a **Worker router**; each app is its own Worker with static assets, routed by path via **service bindings**. Apps stay independent; the hub holds no auth.
- Each app is built with a base path (e.g. Vite `base: '/deal-room/'`) and router `basename`.
- Apps consume the registry via a committed snapshot (single source of truth, drift-gated) — the pattern proven on the website.

## Why

Agents are built once and reused by every app. Apps are the products customers buy. Keeping them separate stops the current muddle where one codebase is both the Portal and the Content Engine app.
