import { z } from 'zod';

// ── Enums ────────────────────────────────────────────────────────────────────
export type StallId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9';
export type Confidence = 'high' | 'medium' | 'low';
export type Severity = 'critical' | 'high' | 'medium';
export type MeddicRole =
  | 'champion' | 'economic_buyer' | 'decision_maker' | 'influencer'
  | 'blocker' | 'user' | 'procurement' | 'legal' | 'security';
export type MilestoneType =
  | 'discovery' | 'technical' | 'exec' | 'commercial'
  | 'procurement' | 'security' | 'legal' | 'signature' | 'kickoff';
export type OwnerSide = 'seller' | 'buyer';
export type Stage = 'discovery' | 'solution' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type PlayRunState =
  | 'proposed' | 'approved' | 'executing' | 'verifying'
  | 'moved_after_play' | 'not_moved' | 'escalated' | 'superseded' | 'dismissed' | 'failed';

// ── Stall catalogue (precedence = root cause first) ──────────────────────────
export interface StallMeta {
  id: StallId;
  name: string;
  severity: Severity;
  precedence: number;
  description: string;
}

export const STALLS: Record<StallId, StallMeta> = {
  S1: { id: 'S1', name: 'No champion', severity: 'critical', precedence: 1, description: 'Nobody inside the account is actively selling on your behalf.' },
  S2: { id: 'S2', name: 'Economic buyer not engaged', severity: 'critical', precedence: 2, description: 'The person who signs has never been in the room.' },
  S3: { id: 'S3', name: 'Single-threaded', severity: 'high', precedence: 3, description: 'One contact carries the whole deal.' },
  S5: { id: 'S5', name: 'Procurement / legal unmapped', severity: 'high', precedence: 4, description: 'The review that kills quarters has not been planned.' },
  S6: { id: 'S6', name: 'Close date not achievable', severity: 'high', precedence: 5, description: 'The plan cannot finish before the close date.' },
  S4: { id: 'S4', name: 'No compelling event', severity: 'medium', precedence: 6, description: 'Nothing forces a decision by a date.' },
  S7: { id: 'S7', name: 'Gone dark', severity: 'high', precedence: 7, description: 'No two-way buyer activity in ten business days.' },
  S8: { id: 'S8', name: 'Competitor active', severity: 'medium', precedence: 8, description: 'A competitor is in the deal and you are not differentiated.' },
  S9: { id: 'S9', name: 'Pricing / commercial stuck', severity: 'medium', precedence: 9, description: 'The commercial step is stalled after the proposal.' },
};

export const STALL_ORDER: StallId[] = (Object.values(STALLS) as StallMeta[])
  .sort((a, b) => a.precedence - b.precedence)
  .map((s) => s.id);

// ── Domain ───────────────────────────────────────────────────────────────────
export interface EvidenceItem {
  type: string;
  ref_id?: string;
  excerpt: string;
  at?: string;
}

export interface StallFinding {
  stall_id: StallId;
  confidence: Confidence;
  severity: Severity;
  evidence: EvidenceItem[];
  detected_at: string;
  explanation?: string;
}

export interface Coverage {
  available: number;
  required: number;
  missing: string[];
  confidence: Confidence;
}

export interface SignalState {
  key: string;
  label: string;
  available: boolean;
}

export interface RealityCheck {
  earliest: string;
  ok: boolean;
  needed_business_days: number;
  missing: string[];
}

export interface MeddicField {
  value?: string;
  status: 'filled' | 'thin' | 'empty';
  evidence_ref?: string;
}

export interface Stakeholder {
  id: string;
  deal_id: string;
  name: string;
  email: string;
  title?: string;
  meddic_role?: MeddicRole;
  role_confirmed: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  last_two_way_at?: string | null;
  engagement_score?: number;
  status: 'mapped' | 'unmapped';
}

export interface Activity {
  id: string;
  deal_id: string;
  type: 'note' | 'email' | 'call' | 'meeting' | 'stage_change';
  direction?: 'in' | 'out';
  stakeholder_id?: string;
  body?: string;
  occurred_at: string;
}

export interface EngagementEvent {
  id: string;
  deal_id: string;
  stakeholder_email: string;
  type: 'room_view' | 'doc_view' | 'download' | 'plan_tick' | 'ask' | 'forward';
  ref_id?: string;
  duration_s?: number;
  occurred_at: string;
}

export interface PlanMilestone {
  id: string;
  deal_id: string;
  title: string;
  type: MilestoneType;
  owner_side: OwnerSide;
  owner_contact_id?: string;
  due_date: string;
  status: 'pending' | 'done' | 'blocked';
  depends_on: string[];
  lead_time_days?: number;
  sort?: number;
}

export interface Brief {
  lines: string[];
  generated_at: string;
}

export interface Deal {
  id: string;
  workspace_id: string;
  hubspot_id?: string;
  name: string;
  account: string;
  amount: number;
  stage: Stage;
  close_date: string;
  close_date_history: string[];
  owner_id: string;
  owner_name: string;
  template_id?: string;
  meddic: Record<string, MeddicField>;
  brief?: Brief;
  created_at: string;
}

export interface PlayStep {
  type: 'draft_email' | 'generate_asset' | 'plan_update' | 'hubspot_task';
  label: string;
  detail?: string;
}

export interface Play {
  id: string;
  name: string;
  stalls: StallId[];
  built: boolean;
  preconditions: string[];
  steps: PlayStep[];
  success_summary: string;
  window_days: number;
  fallback?: string;
  yaml?: string;
}

export interface CoachingCard {
  id: string;
  deal_id: string;
  deal_name: string;
  account: string;
  amount: number;
  close_date: string;
  play_id: string;
  play_name: string;
  stall: StallFinding;
  coverage: Coverage;
  why: string;
  will_do: string[];
  check: string;
  urgency: number;
}

export interface PlayRunStep {
  label: string;
  status: 'pending' | 'done' | 'failed';
  detail?: string;
}

export interface PlayRun {
  id: string;
  deal_id: string;
  play_id: string;
  stall_id: StallId;
  state: PlayRunState;
  depth: number;
  steps: PlayRunStep[];
  approved_by?: string;
  approved_at?: string;
  verify_until?: string;
  outcome?: string;
  outcome_evidence?: EvidenceItem[];
  fallback_run_id?: string;
  dismiss_reason?: string;
  created_at: string;
}

export interface DealRecord {
  deal: Deal;
  stakeholders: Stakeholder[];
  activities: Activity[];
  events: EngagementEvent[];
  plan: PlanMilestone[];
  stalls: StallFinding[];
  coverage: Coverage;
  signals: SignalState[];
  reality: RealityCheck;
  brief?: { lines: string[]; generated_at: string } | null;
  cards: CoachingCard[];
  meddic_strip: { field: string; label: string; status: 'filled' | 'thin' | 'empty'; value?: string }[];
}

// ── LLM output schemas (validated; the LLM never outputs a stall id) ──────────
export const ExtractorOutput = z.object({
  meddic_updates: z.array(z.object({ field: z.string(), value: z.string(), status: z.enum(['filled', 'thin', 'empty']) })).default([]),
  stakeholders: z.array(z.object({
    name: z.string(), title: z.string().optional(), email: z.string().optional(),
    role_hint: z.string().optional(), sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  })).default([]),
  commitments: z.array(z.object({ who: z.string(), what: z.string(), by: z.string().optional() })).default([]),
  competitor_mentions: z.array(z.object({ competitor: z.string(), excerpt: z.string() })).default([]),
  pricing_signals: z.array(z.object({ signal: z.string(), excerpt: z.string() })).default([]),
});
export type ExtractorOutput = z.infer<typeof ExtractorOutput>;

export const DealRoomOutput = z.object({
  brief: z.array(z.string()).min(3).max(6),
  stall_explanations: z.array(z.object({ stall_id: z.enum(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9']), why: z.string() })).default([]),
  risks: z.array(z.object({ severity: z.enum(['critical', 'high', 'medium']), risk: z.string(), why: z.string() })).default([]),
});
export type DealRoomOutput = z.infer<typeof DealRoomOutput>;

export const QualifierOutput = z.object({
  meddic: z.record(z.object({ value: z.string(), status: z.enum(['filled', 'thin', 'empty']), evidence_ref: z.string().optional() })),
});
export type QualifierOutput = z.infer<typeof QualifierOutput>;

export const SniperOutput = z.object({
  email: z.object({ subject: z.string(), body: z.string() }),
  asset: z.object({ type: z.string(), content: z.string() }).optional(),
});
export type SniperOutput = z.infer<typeof SniperOutput>;

export const MEDDIC_FIELDS = ['metrics', 'economic_buyer', 'decision_criteria', 'decision_process', 'identify_pain', 'champion'] as const;
export type MeddicFieldName = typeof MEDDIC_FIELDS[number];
