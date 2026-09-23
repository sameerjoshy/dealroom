// Agent manifests: one adapter per agent (v1). Each declares its system prompt,
// how to build the user message from the deal record, and its zod output schema.
// The LLM extracts facts and drafts; it never outputs a stall id.

import type { DealRecord } from '@dealroom/contracts';
import { DealRoomOutput, QualifierOutput } from '@dealroom/contracts';
import type { ZodType } from 'zod';

export interface AgentManifest {
  id: string;
  system: string;
  user: (r: DealRecord) => string;
  schema: ZodType;
  shape: Record<string, unknown>;
  maxTokens: number;
}

function snapshot(r: DealRecord): string {
  const { deal } = r;
  return JSON.stringify({
    deal: { name: deal.name, account: deal.account, amount: deal.amount, stage: deal.stage, close_date: deal.close_date, close_slips: deal.close_date_history.length, meddic: deal.meddic },
    fired_stalls: r.stalls.map((s) => ({ id: s.stall_id, confidence: s.confidence, evidence: s.evidence.map((e) => e.excerpt) })),
    coverage: { available: r.coverage.available, required: r.coverage.required, missing: r.coverage.missing },
    stakeholders: r.stakeholders.map((s) => ({ name: s.name, title: s.title, role: s.meddic_role ?? 'unknown', confirmed: s.role_confirmed, sentiment: s.sentiment, last_two_way: s.last_two_way_at })),
    plan: r.plan.map((m) => ({ title: m.title, type: m.type, status: m.status, due: m.due_date })),
    recent_activity: r.activities.slice(-10).map((a) => ({ type: a.type, direction: a.direction, body: a.body, at: a.occurred_at })),
  }, null, 1);
}

export const DEAL_ROOM_AGENT: AgentManifest = {
  id: 'deal-room',
  schema: DealRoomOutput,
  maxTokens: 900,
  shape: {
    brief: ['situation line', 'why they buy line', 'where it stands line', 'what is blocking line', 'next milestone line'],
    stall_explanations: [{ stall_id: 'S2', why: 'one grounded sentence' }],
    risks: [{ severity: 'high', risk: 'short risk', why: 'one grounded sentence' }],
  },
  system: `You are the Deal Room agent for a B2B sales team. You turn a deal's record into a short, decisive brief and a risk log.
Rules:
- Use ONLY the facts in the record. Never invent names, numbers, dates, or events.
- If something is missing, say what is missing — do not guess.
- Be specific and decisive. Name the single most likely reason the deal is stuck and the next move.
- No hedging, no filler, no "it seems". Write like a senior operator with scar tissue.
Output: "brief" = an ARRAY of 4-5 short strings (situation · why they buy · where it stands · what's blocking · next milestone). "stall_explanations" = one entry per fired stall id (echo the id). "risks" = the 2-3 things that could kill it, each with severity critical|high|medium.`,
  user: snapshot,
};

export const QUALIFIER_AGENT: AgentManifest = {
  id: 'qualifier',
  schema: QualifierOutput,
  maxTokens: 800,
  shape: {
    meddic: {
      metrics: { value: 'grounded phrase or empty', status: 'filled' },
      economic_buyer: { value: '', status: 'empty' },
      decision_criteria: { value: '', status: 'thin', evidence_ref: 'note 2' },
      decision_process: { value: '', status: 'empty' },
      identify_pain: { value: '', status: 'filled' },
      champion: { value: '', status: 'thin' },
    },
  },
  system: `You qualify B2B deals against MEDDIC using ONLY the record provided.
Return a single "meddic" object with exactly these keys: metrics, economic_buyer, decision_criteria, decision_process, identify_pain, champion.
Each key maps to { "value": a short grounded phrase from the record (or ""), "status": "filled" | "thin" | "empty", "evidence_ref": a short pointer when filled }.
Never invent. If the record doesn't support it, status is "empty".`,
  user: snapshot,
};
