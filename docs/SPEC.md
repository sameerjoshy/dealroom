# Deal Room — Product & Technical Spec (v0.2.2)

**Path:** `apps.gtm-360.com/deal-room` · **Repo:** `dealroom` · **Status:** demo build · **Supersedes:** v0.2.1

---

## 0. What changed from v0.2.1

| # | Change |
|---|---|
| 1 | **Signals fixed.** HubSpot **engagements** (logged emails, calls, meetings) and **property history** (`propertiesWithHistory`) are pulled **in P1**. Only replies/meetings/calls count as two-way; **room views are one-way**. Close-date history is backfilled from HubSpot, not accumulated. |
| 2 | **Coverage badge** (§5.2): silence ≠ health. Every deal shows "N of 7 signals available"; thin data reads "can't assess — missing X", not "healthy". |
| 3 | **Bug fixes:** Today sorts by **urgency** (not amount×days); the duplicate hourly **verify cron is deleted** (the Workflow owns verify). |
| 4 | **Batch approval** replaces cross-deal dedup (§7.1.1): "5 deals have no EB access — review and approve all?" |
| 5 | **Stall precedence** (§5.0): root cause first (S1 → S2 → S3 …); max-2 picks by precedence. |
| 6 | **Close-date contradiction resolved** (§9.1): plays never write CRM-owned fields — `P-CLOSE-PLAN-RESET` creates a **HubSpot task**, not a write. |
| 7 | **Outcome honesty** (§7.8): "moved after play", not "worked because of"; runs shown next to every rate; rates hidden below 5 runs. |
| 8 | **Docs aligned:** champion kit is *the reason a rep sends the room*; `MARKET_RESEARCH.md` marked superseded; adoption mechanics added to the spec. |
| 9 | **Cut to 6 fully-built plays** (one per seed deal); the other 5 are viewable YAML in the Plays library. |
| 10 | **"Diagnose a deal" intake** (§7.10): the VP pastes a real deal story → stalls + coverage + a play in ~30s. |
| 11 | **Triangulation stance** (§1, §5.2): we never have all the data; we triangulate and **commit**, reporting coverage as **confidence, not a caveat**. |
| 12 | **Offensive framing** (§1, §5.2, §7.3, §14): every deal gets a diagnosis + a confidence read — never a refusal. Coverage is the basis of a claim. |

---

## 1. Positioning & demo goal

**One line:** *Deal Room tells a rep why a deal is stuck, which play will move it, runs the play with one approval, and shows whether the deal moved after it.*

**Stance — triangulate, then commit.** We will never have all the data — neither does a good rep. We read every signal available (CRM, engagements, room, notes), **state what we're standing on**, and **commit to the most likely stall and the next move anyway**. Coverage is reported as **confidence, not a hedge**. We don't hide behind missing data; we reason from what exists, say how sure we are, and act — exactly how a human operator does. A genuinely thin signal is itself a finding worth paying for.

**Demo goal:** a VP Sales sees the value in **3 minutes** and asks "can you run this on our pipeline?" — then, via the **Diagnose a deal** intake (§7.10), sees it work on **their own deal**. That's the engagement.

**The buyer-side value is the champion kit** — the forwardable business case / approval memo. That's the reason a rep sends the room. (The procurement-shaped room is the container, not the pitch.)

**Narrative:** Rep — "What do I do today to move my deals?" · Manager — "Which deals are really at risk, why, and who needs coaching?" · Buyer/champion — "Give me what I need to get this approved internally."

### 1.1 Adoption (built in, not bolted on)
- **Today queue** — reps act on a queue, not a list.
- **Batch approval** — clear five stalled deals in one review, not five.
- **Lives where reps work** — a **HubSpot CRM card** (mocked in the demo; real HubSpot UI extension in P2) + Slack + a daily email digest (P2).
- **Time-to-value on their own data** — the §7.10 intake, in ~30 seconds.
- **Zero data entry** — the record comes from HubSpot.

## 2. Decisions (locked)

| Area | Decision |
|---|---|
| Hosting | `apps.gtm-360.com/deal-room` (Worker, path-routed via hub). Buyer room at `/deal-room/r/:token` |
| Login | GTM-360 SSO (seller). Buyer = magic link + email gate, no account |
| Data | Shared Supabase, `dr_` prefix, RLS on `workspace_id` |
| Record | HubSpot is the system of record. **P1 pulls deals, contacts, engagements, and property history.** No sandbox in the demo (config-driven) |
| Coaching | Opinionated, evidence-cited, human-gated. Max **3 cards/deal**, ordered by stall precedence |
| Detection | **Rules decide stalls.** The LLM extracts facts into fields, explains, and drafts. **The LLM never outputs a stall ID.** Missing signal ⇒ the rule does not fire |
| LLM | Provider interface (`llm.generate(schema, prompt)`); DeepSeek default |
| Agents (v1) | `deal-room`, `qualifier`, `sniper`, `extractor`. `listener`/`signals-scout` → P2 |
| Out of scope (demo) | E-sign, CPQ, SSO/SCIM, multi-portal OAuth, NDA gate, watermark, Ask, Settings UI, snooze/quiet mode |

## 3. Core loop

```
DIAGNOSE → PRESCRIBE → EXECUTE → VERIFY → (record updated) → DIAGNOSE
```
Everything written to `dr_audit`. Nothing customer-facing sent without approval.

## 4. IA

```
/deal-room
  ├─ Today        card queue across my deals (+ batch approvals)
  ├─ Deals        list (filter: stall / risk / coverage / close date)
  │   └─ Deal     Overview · Plan · People · Activity
  ├─ Diagnose     paste a deal story → stalls + coverage + a play   ← §7.10
  ├─ Plays        play library (6 built · 5 viewable YAML) + per-play stats
  └─ Manager      pipeline by stall · rep patterns · plays → deals moved
/deal-room/r/:token   buyer room (Plan · Champion kit · Documents)
```

## 5. Stall taxonomy

### 5.0 Precedence (root cause first)
When multiple stalls fire, **precedence decides which show** (max 2) — relationship root causes outrank symptoms. `P-EB-VIA-CHAMPION` requires a champion, so when S1 and S2 both fire, **S1 shows**.
```
S1 No champion → S2 EB not engaged → S3 Single-threaded → S5 Procurement/legal unmapped
→ S6 Close date not achievable → S4 No compelling event → S7 Gone dark → S8 Competitor → S9 Commercial stuck
```

| ID | Stall | Rule (defaults, configurable) | Evidence |
|---|---|---|---|
| S1 | No champion | No `champion`, OR champion silent 14d | Stakeholders, last-touch |
| S2 | EB not engaged | No `economic_buyer`, OR EB no meeting/view 21d after `proposal`+ | EB record, gap |
| S3 | Single-threaded | < 2 buyer contacts with two-way activity 30d, at `solution`+ | Engagement counts |
| S4 | No compelling event | MEDDIC pain/event empty or > 60d, OR close date slipped ≥ 2× | Fields, HubSpot history |
| S5 | Procurement/legal unmapped | `proposal`+ AND no plan milestone `procurement/security/legal` | Plan |
| S6 | Close date not achievable | Reality-check critical path ends after close date | §7.2 calc |
| S7 | Gone dark | No **two-way** buyer activity 10 business days | Last two-way event |
| S8 | Competitor active | Competitor in notes/transcripts 30d (LLM extract), no differentiation play run | Snippet |
| S9 | Pricing/commercial stuck | Proposal viewed ≥ 3× with no reply 7d, OR discount asked in notes | View events, snippet |

**Output:** `{stall_id, confidence, evidence:[{type,ref_id,excerpt,at}], detected_at}`.

### 5.1 Signals required (and degradation)
Diagnosis is only as good as its inputs. **Missing signal ⇒ the rule does not fire** (surfaced as a coverage gap, never a false stall).

| Signal | Source (demo) | Source (real, P1) |
|---|---|---|
| Stage, amount, close date, owner, contacts | Seed | **HubSpot** |
| Close-date history | Seed | **HubSpot `propertiesWithHistory`** (backfilled on first sync) |
| Emails, calls, meetings (**two-way**) | Seed | **HubSpot engagements API (P1)** |
| MEDDIC fields | Seed | Manual / extractor |
| MEDDIC roles | Seed | **Inferred + confirmed** (§7.5.1) |
| Notes / transcripts | Seed | Manual paste / HubSpot notes / Gong (P2) |
| Room views, doc views, dwell (**one-way**) | Seed | **Our own events** (authoritative) |

**Two-way** = a reply, a meeting, or a call. A room view is **one-way** and never counts as `last_two_way_at`.

### 5.2 Confidence, not a caveat (triangulation)
Every deal gets a **diagnosis and a confidence read — never a refusal.** We report how many of the signals a fired rule stands on are present, and translate that into confidence:
- Strong signal + no stall → **"Healthy — high confidence (7/7 signals)."** (Kestrel)
- Partial signal → **still a diagnosis**, labelled e.g. **"EB not engaged — medium confidence (triangulated from 4 of 7 signals)."**
- Genuinely thin → **"Low confidence (2/7). Top hypothesis: X. To firm it up we'd need: roles, two-way activity."** — still a call, plus the path to certainty.
Coverage is the **basis of a claim, not a hedge.** A persistent low-confidence read across the pipeline is itself a finding — and a reason to buy the engagement.

## 6. Play library

A play is **data** (`dr_plays`, seeded from `plays/*.yaml`): trigger stall, steps, success check, fallback.

### 6.1 Schema
```yaml
id: P-EB-VIA-CHAMPION
name: Reach the economic buyer through the champion
stalls: [S2]
preconditions: [has_champion]
talk_track: prompts/eb_via_champion.md
steps:
  - { type: draft_email, to: champion, intent: "ask champion to broker 20-min EB meeting; offer exec summary" }
  - { type: generate_asset, asset: exec_summary_1pager, publish_to_room: champion_kit }
  - { type: plan_update, add_milestone: { title: "EB alignment call", owner_side: buyer, owner_role: champion, due_in_days: 7, type: exec } }
  - { type: hubspot_task, title: "Follow up: EB meeting via {{champion.name}}", due_in_days: 3 }
success:
  any_of: [ { event: meeting_booked_with_role:economic_buyer }, { event: room_view_by_role:economic_buyer }, { event: email_reply_from:champion } ]
  window_days: 7
fallback: P-EB-DIRECT-EXEC-SPONSOR
```
**Rules:** max fallback depth **2** (then escalate); every step idempotent (keyed); success requires the specific signal; the rep can override the outcome.

### 6.2 Plays — 6 built in full, 5 viewable

**Built in full (one per seed deal):**
| Play | Fixes | One approval → | Success (window) | Fallback |
|---|---|---|---|---|
| `P-EB-VIA-CHAMPION` | S2 | Champion email · exec summary → kit · EB milestone · task | EB meeting/view (7d) | `P-EB-DIRECT-EXEC-SPONSOR` |
| `P-PROCUREMENT-PREWIRE` | S5 | Procurement/security/legal milestones from template · security pack published · email for the procurement contact | Procurement contact / milestone accepted (7d) | Escalate |
| `P-MULTI-THREAD` | S3 | 2 role-targeted intro drafts · room invites | ≥ 1 new active contact (14d) | `P-CHAMPION-TEST` |
| `P-BREAK-SILENCE` | S7 | Value-add "give" email · alt-contact email · task | Any two-way activity (7d) | `P-MULTI-THREAD` |
| `P-DIFFERENTIATE` | S8 | Competitive talk track · proof asset in room · case-study email | Asset viewed + reply (10d) | Escalate |
| `P-CHAMPION-TEST` | S1 | Champion-action email · plan milestone · task | Buyer completes the action (10d) | `P-CHAMPION-ALT` |

**Viewable only (YAML in the Plays library):** `P-CHAMPION-ALT` · `P-EB-DIRECT-EXEC-SPONSOR` · `P-COMPELLING-EVENT` · `P-CLOSE-PLAN-RESET` · `P-COMMERCIAL-TRADE`.
> `P-CLOSE-PLAN-RESET` creates a **HubSpot task** suggesting the re-dated plan — it never writes the close date (§9.1).
**Escalate** → Manager card.

## 7. Functional spec

### 7.1 Today
Queue across deals, sorted by **urgency**:
```
urgency = stall_severity(stall) × time_bucket(business_days_to_close)
time_bucket = 3 if ≤14d · 2 if ≤30d · 1 otherwise      # soonest = highest
```
(amount is a tiebreak, not the driver). Groups: **Needs approval · Waiting on outcome · Moved after play (7d) · Escalated**. Header: plays run, deals moved, deals at risk. Empty state: "No deal needs you right now."

### 7.1.1 Portfolio — batch approval
Instead of suppressing repeats, **batch them**: when the same play fires across ≥ 3 deals, Today shows one batch card —
> **5 deals have no economic-buyer access.** Review all → *Approve all · Edit each · Dismiss.*
Batch approval is both an adoption win and the **rep-coaching signal** the Manager view wants (a rep with 5 S2s needs coaching on EB access, not 5 separate emails). A daily card cap still applies.

### 7.2 Plan (MAP) + reality check
Milestones: `title, type, owner_side, owner_contact, due_date, status, depends_on[]`. Templates: Mid-market (30–45d), Enterprise (90d+), Procurement-heavy. **Reality check:** walk dependencies backward from the close date using **business-day** lead times (`security 15 · legal 10 · procurement 10 · signature 3`); output critical path, earliest achievable date, slack; if later than close date → S6. Buyer ticks buyer-owned milestones; every change audited.

### 7.3 Coaching card
```
[Stall] EB not engaged · high          [Confidence] high · 5 of 7 signals
[Why]   At Proposal 23d; CFO (Priya R.) no meetings or room views.
[Evidence] ▸ Stage change 23d ▸ Last CFO touch: never ▸ Champion active 2d
[Play]  Reach the EB through the champion
[Will do] ✉ Draft to champion · 📄 Exec summary → champion kit · ☐ Plan: EB call (7d) · ✓ HubSpot task
[Check]  EB meets or views room within 7 days
[Approve] [Edit] [Dismiss ▾]
```
Edit = inline drafts (remove any step). Dismiss reasons: `already done · wrong read · not now · other`. Dedup: same play within 14d, or the rep already did the main step.

### 7.4 Execution & verify (on Workflows)
```
proposed → approved → executing → verifying ─┬─► moved_after_play
   │                    │                     ├─► not_moved → (fallback | escalate)   [depth ≤ 2]
   └─► dismissed        └─► failed(step)       └─► superseded
```
Steps run in a durable Workflow. **Verify is owned by the Workflow** via `step.waitForEvent` (timeout = the play's window; platform supports 1s–365d; wrap in `try/catch` so a timeout → `not_moved`, not a failed instance). **No verify cron.** Demo: emails land on the Activity timeline (no real send); **"simulate buyer response"** closes the loop live.

### 7.5 People
Contacts with `meddic_role`, `sentiment`, `last_two_way_at`, `engagement_score`. **Coverage grid** (required vs filled roles) → links to `P-MULTI-THREAD`. **Internal forwarding detection:** a room view from a new buyer-domain email → `unmapped` stakeholder + "Who is this?" card.

### 7.5.1 Role inference + confirm
The `extractor` infers roles from titles/notes; inferred roles are **suggested**, one-click confirm. **Untagged ⇒ unknown.** **A person's role is never stated as fact until the rep confirms it** — cards say "suggested: economic buyer", not "the economic buyer".

### 7.6 Call prep & debrief
**Prep** (on-demand, or 30 min before a logged meeting): objective, 3–5 questions for empty MEDDIC fields, stakeholder notes, open plan items, active stall + suggested ask. **Debrief:** paste notes/transcript → extractor returns `{meddic_updates, new_stakeholders, commitments, risks, competitor_mentions}` → rep confirms diff → record updates → follow-up email drafted with commitments as milestones.

### 7.7 Buyer room + champion kit
Magic link + email gate (consent line + retention note); visitor identified by email; views/downloads/dwell → `dr_events`. Sections: **Plan · Champion kit · Documents**.
**Champion kit** (generated by plays, editable before publish): one-page business case, 5-slide internal pitch, approval memo, ROI summary — each with "Share internally" capturing a colleague's email (feeds §7.5). Documents: PDF viewer with a light footer note; NDA gate and watermark are **out of scope** for the demo.

### 7.8 Manager
Pipeline **by stall type** (count, value, oldest); rep patterns (stall frequency vs team median) → coaching topic; play performance — **runs shown next to every rate, rates hidden below 5 runs**; escalations; forecast flag (S6 fired + close date still in-quarter). Dismiss reasons **aggregated per stall rule**. Language is **"moved after play"**, never "worked because of".

### 7.9 Brief
`deal-room` on load (cached, refreshed on change): 5-line brief + MEDDIC strip (filled/thin/empty) + top-2 stalls (by precedence) + ≤ 3 cards + coverage badge.

### 7.10 Diagnose a deal (the demo closer)
A seller/VP pastes an **anonymised deal story or call notes**. The extractor fills the fields, the rules run, and in ~30 seconds they get: **stalls + coverage badge + a recommended play + a drafted email**. It reuses the debrief pipeline (§7.6), so the extra build is small — and it turns "nice demo" into "do this on our HubSpot."

## 8. Agent layer

**Principle:** the LLM extracts facts into fields; **rules decide stalls**; the LLM explains and drafts. **The LLM never outputs a stall ID.**

| Agent | Input | Output (zod) | Used by |
|---|---|---|---|
| `extractor` | note/transcript | `{meddic_updates, stakeholders, commitments, competitor_mentions, pricing_signals, role_hints}` | Debrief, Diagnose-a-deal, S4/S8/S9, roles |
| `deal-room` | deal, stakeholders, plan, 30d activity, fired stalls | `brief`, `stall_explanations[]`, `risks[]` | Overview, cards |
| `qualifier` | deal, notes, transcripts | `meddic{field:{value,status,evidence_ref}}` | MEDDIC strip, S4 |
| `sniper` | play step + deal + recipient | `email{subject,body}`, `asset{type,content}` | Play execution |

- **Manifest** per agent (`agents/<id>/manifest.ts`): input mapper, zod output, prompt, max_tokens, timeout.
- **Contracts:** zod schemas in shared `packages/contracts` (web + api share types).
- **Validation:** parse → 1 repair retry → rule-only card (no LLM text) + log.
- **Caching:** key = hash(agent_id, input snapshot).
- **Draft quality is the product.** The 6 built plays' prompts are hand-tuned; **golden outputs live in the eval set**.
- **Evals** (`npm run eval`): correct stall per seed deal; **healthy deal → no card**; **LLM failure → rule-only card**; **fallback terminates ≤ 2**; **no role stated as fact**; golden draft match.

## 9. Data model (Supabase, `dr_`, RLS on `workspace_id`)

`dr_workspaces · dr_deals (…close_date_history, meddic, brief, brief_hash) · dr_stakeholders · dr_activities · dr_events (append-only, idx (deal_id, occurred_at)) · dr_plan_milestones · dr_plan_templates · dr_stalls · dr_plays · dr_play_runs (steps jsonb, verify_until, outcome, fallback_run_id, dismiss_reason) · dr_rooms · dr_assets · dr_agent_runs · dr_audit · dr_hubspot_syncs`.
Kept as designed: `depends_on uuid[]`, templates as `jsonb`, history via `dr_audit`.

### 9.1 Field ownership
| Field | Owner |
|---|---|
| name, amount, stage, **close date**, owner, contacts | **HubSpot — read-only for us** |
| MEDDIC, plan, stalls, plays, engagement, notes, brief | **Deal Room** |
| `gtm360_stall`, `gtm360_meddic_score`, `gtm360_next_play` | Deal Room → write-back (custom props) |
| Notes / Tasks | **Write-back** (append-only) |

**Close date is never written.** `P-CLOSE-PLAN-RESET` creates a **HubSpot task** proposing the re-dated plan; the rep changes the CRM. **Idempotency:** every step and write-back carries a key; retries never double-create.

## 10. API
`GET /api/today · /api/deals · /api/deals/:id · /api/deals/:id/plan(+reality-check) · /api/deals/:id/prep · /api/deals/:id/debrief(+apply) · /api/plays · /api/manager/overview · /r/:token (+events) · /health`.
`POST /api/deals/:id/diagnose · /api/diagnose-deal` (§7.10) `· /api/play-runs · /api/play-runs/:id/approve|dismiss|simulate · /api/play-runs/batch-approve · /api/hubspot/sync · /api/seed/reset`.
Background: `diagnose` queue · **`play-run` Workflow** (owns verify via `waitForEvent`) · daily `stall-scan` Cron. **No verify cron.**

## 11. Demo seed (6 deals)
Northwind $180k Proposal **S2** → EB-via-champion → simulate → **Moved** · Helix $240k Negotiation **S5+S6** → procurement + reality check · Crestline $95k Solution **S3** → multi-thread + forwarding detection · Orbit $60k Proposal **S7** → break-silence → not moved → fallback · Vantage $310k Solution **S8** → transcript → differentiate · **Kestrel $45k Discovery healthy, full coverage → no cards.** Plus **one thin-data deal → a low-confidence triangulated diagnosis** ("top hypothesis X; to firm it up we'd need Y") to demo the confidence read. Fictional; dates **relative to today**; `POST /api/seed/reset` restores.

## 12. Demo script (3 min)
Today (20s) → Northwind Overview, approve, watch steps (40s) → simulate → Moved (20s) → **batch approval** ("5 deals, approve all") (20s) → Helix Plan reality check (30s) → **Diagnose a deal** on the VP's own notes → stalls + coverage + a play (40s) → Manager (20s) → close (10s).

## 13. Build sequence
1 Scaffold + hub route + seed + shell · 2 Stall rules S1–S7 + precedence + evidence + coverage badge + cards · 3 **6 plays** + **Workflow** run + execute · 4 Agents (extractor/deal-room/qualifier/sniper) + eval + golden drafts · 5 Plan + templates + reality check · 6 Verify (`waitForEvent`) + simulate + fallback + escalate · 7 **Diagnose-a-deal intake** + buyer room + champion kit + forwarding · 8 Prep/debrief · 9 Manager (+ mock HubSpot CRM card) · 10 Polish + dry-run ×3.

## 14. Acceptance criteria (demo)
Every card cites ≥ 1 real evidence row · **no card on Kestrel** · **thin-data deal still gets a triangulated diagnosis with stated confidence (not "healthy", not a refusal)** · approve → steps complete < 10s (or per-step status) · **batch approval clears ≥ 3 deals in one action** · **Diagnose-a-deal returns stalls + coverage + a play in < 30s** · seed reset is exact · **LLM failure → rule-only card** · **fallback terminates** · **no role stated as fact** · Manager hides rates < 5 runs · runs at 1280px + tablet.

## 15. Non-goals (demo)
Real email · e-sign · CPQ/payments · multi-portal OAuth · SSO/SCIM · **NDA gate · watermark · Ask · Settings UI (config file) · snooze/quiet mode · HubSpot sandbox** · server-side view-only render · redaction · Salesforce · mobile · AI buyer assistant · onboarding/renewal rooms · `listener`/`signals-scout`.

## 16. P2
HubSpot OAuth + UI extension (real CRM card) · real mailbox send · Slack + email digest · transcripts (Gong) · `listener`/`signals-scout` stalls · AI buyer assistant → signals · client playbook editor · onboarding handoff room · threshold learning from outcomes · **at scale: monthly-partitioned `dr_events`, `dr_engagement_daily` rollup, 90-day raw retention**.

## 17. Open questions
1. Methodology labels — **MEDDPICC fields + GTM-360 play names** (rec).
2. Coverage badge wording — "can't assess — missing X" (rec) vs "low coverage".
3. Batch threshold — batch at **≥ 3** deals on the same play (rec).
