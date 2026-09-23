# Apps QA Report — Deal Room + Content Engine

**Surface:** `apps.gtm-360.com` · **Date:** 2026-09-23 · **Method:** live browser crawl (Playwright), axe-core WCAG A/AA, link integrity, cross-app review by role.

---

## 1. Automated results (live)

| Check | Deal Room | Content Engine |
|---|---|---|
| Routes render | 7/7 ✓ | 8/8 ✓ (authed → `/login`, expected) |
| Console / page errors | 0 | 0 |
| Dead internal links | 0 | 0 |
| Broken images | 0 | 0 |
| axe a11y (WCAG A/AA) | **0 violations** | **0 violations** |

Harness: `qa/qa.mjs` (routes + links) and `qa/a11y.mjs` (axe). Launcher also 0.

## 2. What's live

```
apps.gtm-360.com        Pages project (domain + thin proxy) → apps-hub Worker
  apps-hub (Worker)     routes by path via service bindings
    ├─ /deal-room        → dealroom-app   (React, /deal-room/)
    ├─ /deal-room/api    → dealroom-api   (Worker: engine + agents + Supabase + HubSpot)
    └─ /content-engine   → content-engine-app (existing Content Engine app)
```
Deal Room runs on the seeded demo store in Supabase; agents (deal-room/qualifier/sniper/extractor) via DeepSeek; HubSpot pull + Notes/Tasks write-back. Content Engine is the existing app (Supabase Auth).

---

## 3. Review by role

### Product Dev Lead / PM — usability & flow
- **Deal Room ✓** — one flow: **Today → Deal → Approve a play → Verify**. Opinionated cards, batch approval, coverage-as-confidence, "Diagnose a deal" for a live deal. Reality-check lands. Restraint shown (Kestrel = no cards).
- **Content Engine — finding.** At `/content-engine` the app **brands itself "Agent Portal"** and its logged-out root shows the **agent-engine Showcase** — not content production. Under a `content-engine` path this is confusing; it's the same muddle we set out to untangle.
- **Finding:** the launcher lists Content Engine as "soon" though it's now live.

### CTO — plumbing, links, perf, security
- **✓** Deploy is clean: Pages (domain) → Worker hub → per-app Workers; service bindings; secrets set on `dealroom-api`; Supabase `dr_` store; HubSpot verified.
- **Blocker:** Content Engine **login** uses `redirectTo: window.location.origin` = `https://apps.gtm-360.com`, which is **not in the Supabase redirect allow-list** → OAuth/email login will fail. Needs a dashboard edit (`project_admin_write` missing on the token).
- **Finding:** Content Engine bundles are heavy (main ~900 KB, Showcase ~1 MB) — code-split candidate.
- **Finding:** `content-engine` is **not under git** → its deploys aren't reproducible.
- **✓** No secrets committed; `.dev.vars`/`.wrangler` ignored.

### Marketing — messaging, outside-in, SEO/AEO
- **Deal Room ✓** — one clear promise ("why a deal is stuck, the play that moves it, proof it worked"); copy is direct, no hedging.
- **Finding:** **naming inconsistency** — the Content Engine app is titled "Agent Portal" and the Agent Portal is a separate surface (`agents.gtm-360.com`). One product, two names.
- **Finding:** Content Engine SEO canonicals/`robots`/`sitemap` still point at `content.gtm-360.com` / `agents.gtm-360.com`, not the new `/content-engine` path.

### Sales — adoption & expansion
- **Deal Room ✓** — adoption built in: Today queue, batch approval, one-click actions, zero data entry, time-to-value via the intake. Plays → outcomes feed the Manager view (rates hidden < 5 runs).
- **✓** Write-back puts the work back in HubSpot, so it lives where reps work.

### CEO — showcase, revenue, word-of-mouth
- **✓** A coherent app portfolio: one launcher, two live products, one brand; the Deal Room loop is a genuine differentiator.
- **Finding:** polish gaps (Content Engine naming/IA) read as "unfinished" on a showcase walkthrough.

---

## 4. Verdict

**Deal Room: ship-ready (demo).** **Content Engine: live but needs three fixes before it reads as a finished product.**

| # | Sev | Finding | Owner |
|---|---|---|---|
| 1 | **High** | Content Engine login allow-list missing `apps.gtm-360.com` | Supabase dashboard |
| 2 | Medium | Content Engine brands "Agent Portal"; root shows the agent Showcase under `/content-engine` | content-engine app |
| 3 | Medium | Content Engine SEO canonicals point at old domains | content-engine app |
| 4 | Medium | Content Engine not under git (deploys not reproducible) | repo setup |
| 5 | Low | Launcher labels Content Engine "soon" | apps-hub |
| 6 | Low | Content Engine bundles heavy (code-split) | content-engine app |

Fix #5 now (trivial); #1 is a dashboard action; #2–#4/#6 are Content Engine work.
