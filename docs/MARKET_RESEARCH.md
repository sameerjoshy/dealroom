# Deal Room — Market Research & Build Feasibility

> **⚠️ SUPERSEDED (2026-09-23).** Written before the product sharpened. Stale here: the domain is now `apps.gtm-360.com/deal-room` (not `deal.gtm-360.com`); "VDR-grade security" is **out of scope** for the demo; and the wedge is now the **agentic loop (Diagnose→Prescribe→Execute→Verify)**, not the buyer-facing room. Current truth: **`SPEC.md` (v0.2.2)**. Keep this file for the market landscape + capability catalogue only.

**Date:** 2026-09-23 · **Purpose:** decide whether GTM-360 should build a standalone, deep-functionality deal room app — and if so, which capabilities to replicate and where to differentiate.

**Verdict: GO — but only with a sharp wedge.** A generic "digital sales room" (DSR) is a crowded, commoditised category (20+ funded players, $0–$100/seat). We should **not** build a me-too DSR. We can build a *high-quality, deep* product if we combine three things nobody does together today: **agentic execution** (tied to our 41-agent engine), **VDR-grade security** in a sales room, and **project-grade mutual action plans**. Detail below.

---

## 1. Market map (2026)

The word "deal room" spans five distinct markets. Confusing them is the #1 scoping risk.

| Category | What it is | Representative vendors |
|---|---|---|
| **Digital Sales Room (DSR)** / buyer enablement / deal room (B2B sales) | Persistent, branded microsite per deal: content + mutual action plan + engagement analytics | Dock, trumpet, Aligned, Flowla, Recapped, GetAccept, Buyerstage, Closepact, DealCollab, Dante (Distribute), Dealday, Peony, Zoomforth, Storylane, EnableUs, HummingDeck |
| **Mutual Action Plan (MAP)** specialists | Shared buyer/seller project plan with owners + dates | Accord, Recapped, Dock, trumpet, Aligned |
| **Proposal / CPQ / e-signature** (adjacent) | Proposal → pricing → signature | GetAccept, DealHub, Qwilr, PandaDoc, Proposify |
| **Sales enablement platforms** with a DSR feature | Content governance + coaching + a room | Highspot, Seismic (merger announced Feb 2026), Mindtickle, Allego, Showpad/Bigtincan, Spekit, GTM Buddy |
| **Virtual Data Room (VDR)** — M&A / legal / fundraising | Secure diligence repository | Datasite, SS&C Intralinks, Ansarada, iDeals, Firmex, DealRoom (M&A), brokr, Peony, MandateRoom, OVI |
| **Trust centers** (adjacent) | Gated security/compliance evidence for procurement | SafeBase, Vendorica, Orbiq |

**Our target is the DSR / buyer-enablement category**, with VDR-grade security and trust-gating capabilities pulled in — that intersection is under-served.

## 2. Market context (why the category exists)

- **Buyers spend <5% of the buying cycle with the seller; ~75% prefer a seller-free experience** (up from 43% in 2021) — so the seller must "sell between meetings" via a shared workspace.
- Buying committees are **6–10 stakeholders**; ~15% of cycle time is wasted reconciling info scattered across channels.
- **Gartner** (Market Guide for DSRs, and Innovation Insight): predicts **30% of B2B sales cycles managed through DSRs by 2026**, 80% of B2B interactions digital, 60% of orgs shifting to data-driven selling.
- **Gartner's mandatory DSR features** (our table-stakes baseline): e-signature + commerce/CPQ integrations; CRM + video + collaboration (Slack/Teams) integrations; bidirectional content sharing for all media types; **buyer engagement analytics**.
- **2026 shift:** every incumbent is adding an "agentic" layer (Highspot Deal Agent, Flowla REX, Spekit AI Sidekick, trumpet Copilot). AI is currently a *feature bolted onto a room*, not the organising principle. That's the gap.

## 3. Capability catalogue — and can we replicate it?

Legend: **Replicate** = we can build it to competitive depth · **Partial** = build a good-enough version, integrate for the rest · **Integrate** = partner, don't build.

### A. Room / workspace
| Capability | Who does it well | Can we? | Notes |
|---|---|---|---|
| Branded microsite per deal | all | **Replicate** | React + per-room route; template → room instantiation |
| Custom domain / subdomain (`acme.gtm-360.com`) | trumpet, Aligned (Ent), Flowla (Team) | **Replicate** | Cloudflare Pages custom domains / wildcard |
| Templates + drag-drop sections | Dock, trumpet | **Replicate** | section schema + renderer |
| Personalization (buyer logo, names, dynamic CRM fields) | all | **Replicate** | token substitution from deal record |
| Link share, no login for buyer | Aligned, Dock | **Replicate** | magic-link + email gate |
| Version control / live updates | trumpet, Flowla | **Replicate** | immutable content versions, live publish |

### B. Content
| Capability | Who does it well | Can we? | Notes |
|---|---|---|---|
| Content library / CMS + governance | Highspot, Seismic, Spekit | **Partial** | start with per-room uploads + a workspace library; governance later |
| Multi-format (docs, video, interactive demo) | all | **Replicate** | R2 storage; PDF/PPTX/DOCX render; video; embed |
| Gated sections / tabs | Aligned ("secured tabs") | **Replicate** | per-stakeholder visibility |
| Page-level + time-on-page analytics | Dock, Flowla | **Replicate** | client event stream → analytics store |
| Dynamic updates after send | all | **Replicate** | live room state |

### C. Mutual Action Plan (MAP)
| Capability | Who does it well | Can we? | Notes |
|---|---|---|---|
| Shared milestones, both-side owners, due dates | Dock, Accord, trumpet | **Replicate** | project model (tasks, owners, deps) |
| Reminders + notifications | Recapped, Dock | **Replicate** | email/Slack |
| Buyer can assign/complete tasks | Aligned, Flowla | **Replicate** | buyer-side task permissions |
| Cross-deal MAP dashboard | trumpet | **Replicate** | workspace view |
| Methodology frameworks (MEDDIC/SPICED/BANT) | Recapped | **Replicate** | qualification templates |
| Project-grade (dependencies, critical path, post-sale) | **thin across the market** | **Replicate — differentiator** | most MAPs are shallow checklists |

### D. Collaboration
| Capability | Who does it well | Can we? | Notes |
|---|---|---|---|
| Deal-scoped chat / comments | trumpet, Aligned, GetAccept | **Replicate** | Durable Objects WebSockets |
| Internal-only notes | Aligned (Ent), Recapped | **Replicate** | visibility scopes |
| Video/voice messages, live huddles | trumpet | **Partial/Integrate** | start with recorded video + Zoom/Meet links |
| Slack/Teams notifications | Dock, trumpet | **Replicate** | webhooks |

### E. Analytics & deal intelligence
| Capability | Who does it well | Can we? | Notes |
|---|---|---|---|
| Person-level engagement (views, clicks, downloads, time, scroll, page-level) | Dock, Highspot, Flowla | **Replicate** | event pipeline |
| Engagement / deal-health score | trumpet, Recapped, Flowla | **Replicate** | scoring model |
| Stakeholder mapping / AI org chart | trumpet, Aligned | **Replicate** | email domain + title inference |
| "Buyer went dark" alerts | Dock, Flowla | **Replicate** | rules + scheduler |
| Next-best-action, AI summaries | Highspot, Flowla, Spekit | **Replicate + differentiate** | DeepSeek + our agents |

### F. Commerce
| Capability | Who does it well | Can we? | Notes |
|---|---|---|---|
| Proposals, pricing tables, quotes | GetAccept, DealHub, Qwilr | **Partial** | build proposals; integrate CPQ if needed |
| E-signature | GetAccept (native), others via DocuSign/PandaDoc | **Integrate** | native e-sign is a legal lift; integrate first |
| Order forms / payment | Dock, DealHub | **Integrate** | Stripe |

### G. Access & security
| Capability | Who does it well | Can we? | Notes |
|---|---|---|---|
| Password / email verification / domain gating | all DSR; Peony, MandateRoom (VDR) | **Replicate** | |
| Expiry, revocation, download controls | VDRs; Peony | **Replicate** | |
| NDA gate (click-wrap / e-sign) | VDRs, trust centers, GetAccept | **Replicate** | NDA template + signature record |
| Per-visitor dynamic watermarking | VDRs, Peony, brokr | **Replicate** | overlay watermark on render |
| View-only server-side rendering (originals never sent) | MandateRoom, Intralinks | **Partial** | heavier; PDF.js client render + overlay first, server render later |
| Screenshot deterrence | Peony | **Partial** | best-effort only |
| Redaction | Datasite, brokr | **Partial** | later |
| SSO/SCIM, MFA, roles, IP allowlist, audit log | enterprise DSR/VDR | **Replicate** | Supabase Auth + RLS + audit table |
| **VDR-grade security inside a sales DSR** | **almost nobody** | **Replicate — differentiator** | this is a real wedge for procurement-heavy deals |

### H. Integrations
| Capability | Who does it well | Can we? | Notes |
|---|---|---|---|
| CRM (HubSpot/Salesforce bidirectional) | Dock, GetAccept, Aligned (Ent) | **Replicate** | HubSpot first |
| Slack/Teams, email, calendar | all | **Replicate** | |
| Gong / call transcripts | Aligned (Pro), Flowla | **Integrate** | |
| Storage (Drive/SharePoint/Dropbox) | VDRs, Dock | **Integrate** | |
| API / webhooks / Zapier / MCP | Closepact, Dock (MCP) | **Replicate** | Cloudflare Workers API + MCP |

### I. Lifecycle
| Capability | Who does it well | Can we? | Notes |
|---|---|---|---|
| Sales → onboarding → CS portal → renewal | Dock, Aligned, Flowla | **Replicate — differentiator** | most stop at close |
| QBR / renewal rooms | trumpet, Aligned | **Replicate** | |

### J. AI (2026 wave)
| Capability | Who does it well | Can we? | Notes |
|---|---|---|---|
| AI room builder / content generation | trumpet, Aligned, Flowla | **Replicate** | DeepSeek |
| Buyer-facing AI assistant (answers from room only) | Aligned ("Client Assist") | **Replicate** | RAG over room content |
| AI deal health + next-best-action | Highspot Deal Agent, Flowla REX, Spekit | **Replicate + differentiate** | tie to our agents |
| Agentic execution (draft follow-ups, update CRM, act) | Flowla REX, Spekit | **Replicate — our moat** | our agent engine already does this |

## 4. Pricing landscape (public list, 2026)

| Vendor | Entry | Mid | Enterprise |
|---|---|---|---|
| Aligned | Free (4 rooms/seat) | Basic $29–35, Pro $49–60/seat | custom |
| Flowla | Free (20 rooms) | Pro $39–49, Team $65–99/seat | custom |
| trumpet | Free (10 pods) | Pro ~$45 (≤5 users), Scale ~$100/user | custom |
| Dock | Free (10 workspaces) | Standard $350/mo (5 seats) ≈ $70/user; Premium $1,000/mo | custom |
| GetAccept | — | $49/user/mo (5-seat min, annual) | custom |
| Accord | free plan | ~$99/user/mo | custom |
| Storylane | Free | $29/user | custom |
| Recapped / DealHub / Seismic / Highspot | — | — | custom |
| VDR (Datasite, Intralinks) | — | priced per deal/project | $$$$ |
| Trust centers (SafeBase) | — | — | ~$8k–20k/yr |

**Implication:** the category is priced cheap and seat-based; a me-too DSR has no pricing power. Differentiation (agentic + VDR-grade + lifecycle) justifies premium/outcome pricing.

## 5. Where we win (the wedge)

1. **Agentic deal execution — our moat.** Incumbents bolt an AI copilot onto a room. We already run a **41-agent engine** (`@gtm360/agent-registry`) with the Deal Room, Qualifier, Sniper, Forecast Analyser, Hygiene, Chief of Staff agents. The room becomes the **signal surface** that feeds the engine, and the engine **drafts and executes the next move** (follow-up, MAP update, CRM write, risk flag). Nobody in the DSR category has this depth.
2. **VDR-grade security inside a sales room.** Watermarking, NDA gating, view-only rendering, revocation, audit — currently only in the M&A VDR category. Selling into procurement-heavy enterprise with this built in is a credible differentiator.
3. **Project-grade MAP + lifecycle continuity.** Most MAPs are checklists; most DSRs stop at close. A room that carries deal → onboarding → CS → renewal, with real project mechanics, is differentiated.
4. **Outcome-driven framing.** Ties to the GTM-360 bowtie method (Strategy → Attract → Convert → Grow → Operations) — the room is where "Convert" and "Grow" actually happen, wired to the rest of the engine.

## 6. Feasibility on our stack

We already have every primitive needed:

| Need | Our primitive |
|---|---|
| Web app + hosting | Cloudflare Pages (`deal.gtm-360.com` or `rooms.gtm-360.com`) |
| API / backend | Cloudflare Workers (pattern proven by `content-engine-api`) |
| Real-time (chat, presence, live analytics) | Durable Objects (WebSockets) |
| Content storage | R2 (signed URLs) + Cloudflare Images |
| Data / auth / RLS | Supabase (`agrnbsaaxdbvlcdqtnwo`) + existing `.gtm-360.com` SSO |
| Automation / scheduling / alerts | Workers Queues + Workflows + Cron (proven in content-engine) |
| AI | DeepSeek (existing worker pattern) + agent-registry (41 agents) |
| Email | Cloudflare Email / Resend |
| Integrations | Workers + webhooks; HubSpot first |

**Buildable now.** The hard/risky pieces are (a) e-signature (integrate, don't build), (b) server-side document rendering for true view-only/watermarking (phase it), (c) CRM auth/scope plumbing, (d) real-time infra at scale.

## 7. Risks & non-goals

- **Crowded market, cheap prices** → without the wedge, no pricing power. Wedge is mandatory, not optional.
- **E-signature legal validity** (eIDAS/ESIGN) → integrate a provider in v1.
- **VDR-grade rendering cost/complexity** → phase: client-render + overlay watermark first; server render later.
- **Buyer adoption friction** → no-login links + email gate; never force account creation.
- **CRM integration depth** is a big lift → HubSpot first, Salesforce later.
- **Non-goals for v1:** native CPQ engine, payment processing, full M&A diligence Q&A/redaction, mobile apps.

## 8. Proposed v1 scope (deep but shippable)

**Phase 1 — Credible DSR (table stakes):**
Branded rooms + templates + personalization; content (upload/render/gated sections/versions); **MAP** (milestones, both-side owners, dates, reminders, dashboard); **engagement analytics** (person-level, time/page, score, alerts); **access** (link + email gate + password + expiry + revocation + per-visitor watermark + NDA gate + audit log); comments/chat; proposals + pricing; **e-sign via integration**; HubSpot integration; AI room builder + summaries + next-best-action.

**Phase 2 — Differentiators:**
Agent integration (engine runs in the room; signals → agents → drafted actions); VDR-grade (view-only server render, screenshot deterrence, download controls, redaction); trust/security gating (NDA-gated security docs, questionnaire autofill); deep MAP (dependencies, critical path, post-sale); lifecycle continuity (onboarding/CS/renewal rooms); AI stakeholder org chart; Slack/Teams.

**Phase 3 — Scale:**
Salesforce, API/webhooks/MCP, SSO/SCIM, multi-workspace, advanced governance, usage/outcome pricing.

## 9. Recommendation

**GO.** Build a standalone deal room app at `deal.gtm-360.com`, but position it as **"the agentic, VDR-secure deal room"** — not another DSR. Replicate the full table-stakes capability set (§3 A–F, H) to be credible, integrate e-sign/CRM-depth, and win on the three differentiators in §5. The engine is the moat; the room is its surface.

**Next step:** product/technical spec for Phase 1 (IA, data model, room renderer, analytics event schema, security model), then scaffold the app.

---

## Sources (selected)
Gartner — Market Guide for Digital Sales Rooms; Innovation Insight for DSRs; Gartner Peer Insights (DSR). Vendor pages: Dock, trumpet, Aligned, Flowla, Recapped, GetAccept, Buyerstage, Closepact, DealCollab, Spekit, Highspot, Allego, Peony, MandateRoom, Vendorica, Datasite, SS&C Intralinks, DealRoom (M&A), brokr, Storylane, HummingDeck, Distribute. Pricing/comparison write-ups: HummingDeck DSR comparison (Aug 2026), Distribute DSR ranking (Aug 2026), dealcollab Aligned alternatives (Jul 2026), rfp.wiki Aligned pricing (Jul 2026), Storylane DSR comparison (Sep 2026).
