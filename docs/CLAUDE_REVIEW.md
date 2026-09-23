# Claude Review — Deal Room (v0.2.2)

> The v0.2.1 review is incorporated (see `SPEC.md` §0). Use this brief if a further pass is wanted.

Copy everything below into Claude.

---

**Context.** Scoping a standalone B2B **sales room** product for GTM-360 (a small GTM strategy firm with an existing agent engine). **The customer is the sales organisation.** HubSpot is the system of record — **P1 pulls deals, contacts, engagements and property history**. The buyer-facing room's real value is the **champion kit** (forwardable business case / approval memo) — that's the reason a rep sends the room; the procurement-shaped container is secondary. Stack: Cloudflare (Workers, Workflows, Durable Objects, R2, Queues, Cron) + Supabase + DeepSeek. Single GTM-360 SSO. **Demo product first — the goal is to win GTM-360 engagements.**

**Stance.** We'll never have all the data; we **triangulate**, state our **coverage**, and still give a strong, evidence-cited opinion. Thin data surfaces as a coverage gap (a reason to buy the engagement), not as false health.

**The wedge.** The seller's deal record + an agentic loop: **Diagnose → Prescribe → Execute → Verify.**
- **Diagnose:** a **stall taxonomy** (S1–S9) with a **root-cause precedence order**. **Rules decide stalls; the LLM extracts facts, explains and drafts — it never outputs a stall ID.** Missing signal ⇒ the rule does not fire.
- **Prescribe:** a **play library as data** (YAML → DB): trigger stall, steps, success signal, fallback. **6 plays built in full; 5 viewable.**
- **Execute:** one approval runs the bundle; **batch approval** clears the same stall across many deals at once.
- **Verify:** the **Workflow** watches the success signal via `waitForEvent` → **moved_after_play / not_moved** → fallback (depth ≤ 2 → escalate). No verify cron.
- Home = **Today** queue (urgency-sorted); Deal = 4 tabs; plus **Diagnose a deal** (paste a real deal story → stalls + coverage + a play in ~30s), Plays, Manager, buyer room.
- **Coverage badge** per deal ("N of 7 signals available") — silence ≠ health.
- v1 agents: `extractor`, `deal-room`, `qualifier`, `sniper`.

**#1 risk: adoption.** Mitigations: Today queue · batch approval · a mock HubSpot CRM card in the demo (real UI extension in P2) · Slack + digest (P2) · time-to-value on the buyer's own data (the intake) · zero data entry.

**Questions:**
1. Is the loop + stall taxonomy the right wedge for a **demo**, or is "plays + verify" still too much to build well in the time?
2. Is pulling HubSpot engagements + property history enough to make S1/S3/S7 fire credibly, or do we still need email/calendar in P1?
3. **Confidence framing** — we report coverage as *confidence* and still commit to a diagnosis ("medium confidence — triangulated from 4 of 7 signals"). Does that read as bold-and-honest, or does it invite doubt?
4. **Batch approval** — is "≥ 3 deals on the same play" the right trigger, and does it risk feeling like bulk spam?
5. Anything else to **cut** to make the demo sharper (we already cut NDA/watermark/Ask/Settings/snooze/sandbox and 5 plays)?
6. Is **"moved after play"** the right honesty level for the outcome metric, or does it undersell?

**Want back:** candid critique, a go/no-go on the demo scope, and the 3 highest-leverage changes before we build.
