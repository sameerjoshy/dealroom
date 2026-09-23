// Deterministic stall detection. Rules decide; the LLM never outputs a stall id.
// Missing signal ⇒ the rule does not fire (surfaced as a coverage gap).

import type {
  Activity, Confidence, Coverage, Deal, EngagementEvent, EvidenceItem,
  PlanMilestone, RealityCheck, SignalState, StallFinding, Stakeholder,
} from '@dealroom/contracts';
import { STALLS } from '@dealroom/contracts';
import { addBusinessDays, businessDaysBetween, daysBetween, nowIso } from './lib/util';

const TWO_WAY = new Set(['email', 'call', 'meeting']);
const STAGE_RANK: Record<string, number> = {
  discovery: 1, solution: 2, proposal: 3, negotiation: 4, closed_won: 5, closed_lost: 5,
};

export interface Assessment {
  signals: SignalState[];
  coverage: Coverage;
  stalls: StallFinding[];
  reality: RealityCheck;
}

/** Remaining lead time to close, walked from the required review milestones. */
export function realityCheck(deal: Deal, plan: PlanMilestone[]): RealityCheck {
  const required: Record<string, number> = { security: 15, legal: 10, procurement: 10, signature: 3 };
  let needed = 0;
  const missing: string[] = [];
  for (const [type, lead] of Object.entries(required)) {
    const m = plan.find((x) => x.type === type);
    if (!m || m.status !== 'done') { needed += lead; missing.push(type); }
  }
  const earliest = addBusinessDays(new Date(), needed).toISOString().slice(0, 10);
  return { earliest, ok: new Date(earliest) <= new Date(deal.close_date), needed_business_days: needed, missing };
}

export function assess(
  deal: Deal,
  stakeholders: Stakeholder[],
  activities: Activity[],
  events: EngagementEvent[],
  plan: PlanMilestone[],
): Assessment {
  const stageRank = STAGE_RANK[deal.stage] ?? 0;
  const twoWayActs = activities.filter((a) => TWO_WAY.has(a.type));
  const lastTwoWay = twoWayActs
    .map((a) => a.occurred_at)
    .sort()
    .at(-1);

  const signals: SignalState[] = [
    { key: 'crm_core', label: 'CRM fields', available: Boolean(deal.stage && deal.amount && deal.close_date) },
    { key: 'close_history', label: 'close-date history', available: deal.close_date_history.length > 0 },
    { key: 'contacts', label: 'contacts', available: stakeholders.length > 0 },
    { key: 'roles', label: 'confirmed roles', available: stakeholders.some((s) => Boolean(s.meddic_role)) },
    { key: 'two_way', label: 'two-way activity', available: twoWayActs.length > 0 },
    { key: 'notes', label: 'notes / transcripts', available: activities.some((a) => a.type === 'note' || (a.body?.length ?? 0) > 40) },
    { key: 'engagement', label: 'room engagement', available: events.length > 0 },
  ];
  const required = signals.length;
  const available = signals.filter((s) => s.available).length;
  const missing = signals.filter((s) => !s.available).map((s) => s.label);
  const confidence: Confidence = available >= 6 ? 'high' : available >= 4 ? 'medium' : 'low';
  const coverage: Coverage = { available, required, missing, confidence };

  const rolesAvailable = signals.find((s) => s.key === 'roles')!.available;
  const rolesConfirmed = stakeholders.some((s) => s.meddic_role && s.role_confirmed);
  const champion = stakeholders.find((s) => s.meddic_role === 'champion');
  const eb = stakeholders.find((s) => s.meddic_role === 'economic_buyer');

  const fired: StallFinding[] = [];
  const push = (stall_id: StallFinding['stall_id'], c: Confidence, evidence: EvidenceItem[], explanation?: string) =>
    fired.push({ stall_id, confidence: c, severity: STALLS[stall_id].severity, evidence, detected_at: nowIso(), explanation });

  // S1 — No champion
  if (rolesAvailable) {
    if (!champion) {
      push('S1', rolesConfirmed ? 'high' : 'medium', [
        { type: 'stakeholder', excerpt: `No champion among ${stakeholders.length} mapped contact(s) — nobody is selling internally.` },
      ]);
    } else if (champion.last_two_way_at) {
      const gap = businessDaysBetween(champion.last_two_way_at);
      if (gap > 14) push('S1', 'high', [
        { type: 'stakeholder', ref_id: champion.id, excerpt: `${champion.name} (champion) silent ${gap} business days.` },
      ]);
    }
  }

  // S2 — Economic buyer not engaged
  if (rolesAvailable && stageRank >= 3) {
    if (!eb) {
      push('S2', 'high', [
        { type: 'stakeholder', excerpt: `No economic buyer identified — the person who signs has never been in the room.` },
      ]);
    } else if (eb.last_two_way_at) {
      const gap = businessDaysBetween(eb.last_two_way_at);
      if (gap > 21) push('S2', 'high', [
        { type: 'stakeholder', ref_id: eb.id, excerpt: `${eb.name} (economic buyer) no two-way contact in ${gap} business days.` },
      ]);
    }
  }

  // S3 — Single-threaded
  if (rolesAvailable && stageRank >= 2) {
    const active = stakeholders.filter((s) => s.last_two_way_at && daysBetween(s.last_two_way_at) <= 30).length;
    if (active < 2) push('S3', 'high', [
      { type: 'stakeholder', excerpt: `Only ${active} buyer contact(s) active in the last 30 days.` },
    ]);
  }

  // S4 — No compelling event
  if (deal.close_date_history.length >= 2) {
    push('S4', 'medium', [
      { type: 'close_date', excerpt: `Close date has moved ${deal.close_date_history.length} times — no event is forcing a decision.` },
    ]);
  } else if (!deal.meddic.identify_pain?.value) {
    const age = daysBetween(deal.created_at);
    if (age > 60) push('S4', 'medium', [
      { type: 'meddic', excerpt: `No compelling event captured after ${age} days in the deal.` },
    ]);
  }

  // S5 — Procurement / legal unmapped
  if (stageRank >= 3 && !plan.some((m) => ['procurement', 'security', 'legal'].includes(m.type))) {
    push('S5', 'high', [
      { type: 'plan', excerpt: 'No procurement, security or legal milestone in the plan — the review that kills quarters is unmapped.' },
    ]);
  }

  // S6 — Close date not achievable
  const reality = realityCheck(deal, plan);
  if (stageRank >= 3 && !reality.ok) {
    push('S6', 'high', [
      { type: 'plan', excerpt: `Earliest achievable close is ${reality.earliest}; the CRM close date is ${deal.close_date}.` },
    ]);
  }

  // S7 — Gone dark
  if (signals.find((s) => s.key === 'two_way')!.available && lastTwoWay) {
    const gap = businessDaysBetween(lastTwoWay);
    if (gap > 10) push('S7', 'high', [
      { type: 'activity', excerpt: `No two-way buyer activity in ${gap} business days.` },
    ]);
  }

  // S8 — Competitor active
  const competitor = activities.find((a) => a.body && /acme|competitor|rival/i.test(a.body) && daysBetween(a.occurred_at) <= 30);
  if (competitor) {
    push('S8', 'medium', [
      { type: 'activity', ref_id: competitor.id, excerpt: competitor.body!.slice(0, 140) },
    ]);
  }

  // S9 — Pricing / commercial stuck
  const proposalViews = events.filter((e) => e.type === 'doc_view' && e.ref_id === 'proposal').length;
  const discount = activities.find((a) => a.body && /discount/i.test(a.body));
  if (proposalViews >= 3 || discount) {
    push('S9', 'medium', [
      { type: 'engagement', excerpt: discount ? 'A discount was requested and the commercial step has stalled.' : `Proposal viewed ${proposalViews}× with no reply.` },
    ]);
  }

  fired.sort((a, b) => STALLS[a.stall_id].precedence - STALLS[b.stall_id].precedence);
  return { signals, coverage, stalls: fired, reality };
}
