// Seeded demo data. Every date is RELATIVE to "now" so the stalls fire the same
// way on any demo day. Companies and people are fictional.

import type {
  Activity, Deal, EngagementEvent, PlanMilestone, Stakeholder,
} from '@dealroom/contracts';
import { dayOffset, tsOffset } from './lib/util';

export interface Seed {
  deals: Deal[];
  stakeholders: Stakeholder[];
  activities: Activity[];
  events: EngagementEvent[];
  plans: PlanMilestone[];
}

const W = 'demo-ws';

function meddic(over: Record<string, { value: string; status: 'filled' | 'thin' | 'empty' }> = {}) {
  const base: Deal['meddic'] = {
    metrics: { status: 'empty' }, economic_buyer: { status: 'empty' },
    decision_criteria: { status: 'empty' }, decision_process: { status: 'empty' },
    identify_pain: { status: 'empty' }, champion: { status: 'empty' },
  };
  for (const [k, v] of Object.entries(over)) base[k] = v;
  return base;
}

export function seed(): Seed {
  const deals: Deal[] = [
    {
      id: 'd-northwind', workspace_id: W, name: 'Northwind Logistics — Ops platform', account: 'Northwind Logistics',
      amount: 180000, stage: 'proposal', close_date: dayOffset(21), close_date_history: [dayOffset(35)],
      owner_id: 'u-amy', owner_name: 'Amy Chen', template_id: 'tpl-midmarket', created_at: tsOffset(-64),
      meddic: meddic({
        identify_pain: { value: 'Manual dispatch reconciliation costs ~30 ops hours/week', status: 'filled' },
        champion: { value: 'Dana Whitfield (Ops Director) is running the internal case', status: 'filled' },
        decision_criteria: { value: 'Integration with existing TMS; SOC 2', status: 'thin' },
      }),
    },
    {
      id: 'd-helix', workspace_id: W, name: 'Helix Health — Compliance suite', account: 'Helix Health',
      amount: 240000, stage: 'negotiation', close_date: dayOffset(7), close_date_history: [dayOffset(28), dayOffset(14)],
      owner_id: 'u-amy', owner_name: 'Amy Chen', template_id: 'tpl-enterprise', created_at: tsOffset(-96),
      meddic: meddic({
        identify_pain: { value: 'Audit findings put Q3 accreditation at risk', status: 'filled' },
        champion: { value: 'Marcus Reed (VP Clinical Ops)', status: 'filled' },
        economic_buyer: { value: 'CFO — Priya Raman', status: 'filled' },
        decision_process: { value: 'Security review then legal redlines, then CFO sign-off', status: 'thin' },
      }),
    },
    {
      id: 'd-crestline', workspace_id: W, name: 'Crestline Bank — Onboarding automation', account: 'Crestline Bank',
      amount: 95000, stage: 'solution', close_date: dayOffset(40), close_date_history: [],
      owner_id: 'u-amy', owner_name: 'Amy Chen', template_id: 'tpl-midmarket', created_at: tsOffset(-38),
      meddic: meddic({
        identify_pain: { value: 'KYC onboarding takes 11 days end to end', status: 'filled' },
        champion: { value: 'Elena Voss (Head of Digital)', status: 'thin' },
      }),
    },
    {
      id: 'd-orbit', workspace_id: W, name: 'Orbit Retail — Demand forecasting', account: 'Orbit Retail',
      amount: 60000, stage: 'proposal', close_date: dayOffset(30), close_date_history: [dayOffset(44)],
      owner_id: 'u-amy', owner_name: 'Amy Chen', template_id: 'tpl-midmarket', created_at: tsOffset(-58),
      meddic: meddic({
        identify_pain: { value: 'Stockouts on top-50 SKUs cost ~$400k/quarter', status: 'filled' },
        champion: { value: 'Ravi Menon (Supply Chain Lead)', status: 'filled' },
        economic_buyer: { value: 'COO — Sandra Pike', status: 'filled' },
      }),
    },
    {
      id: 'd-vantage', workspace_id: W, name: 'Vantage Energy — Field service', account: 'Vantage Energy',
      amount: 310000, stage: 'solution', close_date: dayOffset(45), close_date_history: [],
      owner_id: 'u-amy', owner_name: 'Amy Chen', template_id: 'tpl-enterprise', created_at: tsOffset(-52),
      meddic: meddic({
        identify_pain: { value: 'Technician utilisation stuck at 61%', status: 'filled' },
        champion: { value: 'Grace Okafor (VP Field Ops)', status: 'filled' },
        economic_buyer: { value: 'COO — Tom Barrett', status: 'filled' },
      }),
    },
    {
      id: 'd-kestrel', workspace_id: W, name: 'Kestrel SaaS — Usage analytics', account: 'Kestrel SaaS',
      amount: 45000, stage: 'discovery', close_date: dayOffset(60), close_date_history: [],
      owner_id: 'u-amy', owner_name: 'Amy Chen', template_id: 'tpl-midmarket', created_at: tsOffset(-20),
      meddic: meddic({
        identify_pain: { value: 'Cannot see feature adoption by segment', status: 'filled' },
        champion: { value: 'Noah Fields (Product Ops)', status: 'filled' },
        economic_buyer: { value: 'VP Product — Hana Ito', status: 'filled' },
      }),
    },
    {
      // Thin data — the triangulation demo: a low-confidence diagnosis, not a shrug.
      id: 'd-beacon', workspace_id: W, name: 'Beacon Media — Renewal expansion', account: 'Beacon Media',
      amount: 70000, stage: 'solution', close_date: dayOffset(25), close_date_history: [dayOffset(50), dayOffset(37)],
      owner_id: 'u-amy', owner_name: 'Amy Chen', created_at: tsOffset(-70),
      meddic: meddic(),
    },
  ];

  const stakeholders: Stakeholder[] = [
    // Northwind — champion, no economic buyer
    { id: 's-nw-dana', deal_id: 'd-northwind', name: 'Dana Whitfield', email: 'dana@northwind.example', title: 'Ops Director', meddic_role: 'champion', role_confirmed: true, sentiment: 'positive', last_two_way_at: tsOffset(-2), engagement_score: 78, status: 'mapped' },
    { id: 's-nw-liam', deal_id: 'd-northwind', name: 'Liam Boyd', email: 'liam@northwind.example', title: 'Ops Analyst', meddic_role: 'user', role_confirmed: true, sentiment: 'neutral', last_two_way_at: tsOffset(-6), engagement_score: 41, status: 'mapped' },
    // Helix — champion + EB engaged
    { id: 's-hx-marcus', deal_id: 'd-helix', name: 'Marcus Reed', email: 'marcus@helix.example', title: 'VP Clinical Ops', meddic_role: 'champion', role_confirmed: true, sentiment: 'positive', last_two_way_at: tsOffset(-1), engagement_score: 84, status: 'mapped' },
    { id: 's-hx-priya', deal_id: 'd-helix', name: 'Priya Raman', email: 'priya@helix.example', title: 'CFO', meddic_role: 'economic_buyer', role_confirmed: true, sentiment: 'neutral', last_two_way_at: tsOffset(-3), engagement_score: 66, status: 'mapped' },
    // Crestline — one contact only (single-threaded)
    { id: 's-cr-elena', deal_id: 'd-crestline', name: 'Elena Voss', email: 'elena@crestline.example', title: 'Head of Digital', meddic_role: 'champion', role_confirmed: true, sentiment: 'positive', last_two_way_at: tsOffset(-2), engagement_score: 72, status: 'mapped' },
    // Orbit — champion + EB, but silent
    { id: 's-or-ravi', deal_id: 'd-orbit', name: 'Ravi Menon', email: 'ravi@orbit.example', title: 'Supply Chain Lead', meddic_role: 'champion', role_confirmed: true, sentiment: 'neutral', last_two_way_at: tsOffset(-17), engagement_score: 30, status: 'mapped' },
    { id: 's-or-sandra', deal_id: 'd-orbit', name: 'Sandra Pike', email: 'sandra@orbit.example', title: 'COO', meddic_role: 'economic_buyer', role_confirmed: true, sentiment: 'neutral', last_two_way_at: tsOffset(-24), engagement_score: 22, status: 'mapped' },
    // Vantage — healthy relationships, competitor in the deal
    { id: 's-vn-grace', deal_id: 'd-vantage', name: 'Grace Okafor', email: 'grace@vantage.example', title: 'VP Field Ops', meddic_role: 'champion', role_confirmed: true, sentiment: 'positive', last_two_way_at: tsOffset(-1), engagement_score: 80, status: 'mapped' },
    { id: 's-vn-tom', deal_id: 'd-vantage', name: 'Tom Barrett', email: 'tom@vantage.example', title: 'COO', meddic_role: 'economic_buyer', role_confirmed: true, sentiment: 'neutral', last_two_way_at: tsOffset(-4), engagement_score: 58, status: 'mapped' },
    // Kestrel — healthy
    { id: 's-ks-noah', deal_id: 'd-kestrel', name: 'Noah Fields', email: 'noah@kestrel.example', title: 'Product Ops', meddic_role: 'champion', role_confirmed: true, sentiment: 'positive', last_two_way_at: tsOffset(-1), engagement_score: 76, status: 'mapped' },
    { id: 's-ks-hana', deal_id: 'd-kestrel', name: 'Hana Ito', email: 'hana@kestrel.example', title: 'VP Product', meddic_role: 'economic_buyer', role_confirmed: true, sentiment: 'positive', last_two_way_at: tsOffset(-3), engagement_score: 63, status: 'mapped' },
    // Beacon — thin: one unconfirmed contact, no roles
    { id: 's-bc-ana', deal_id: 'd-beacon', name: 'Ana Torres', email: 'ana@beacon.example', title: 'Marketing Manager', role_confirmed: false, status: 'mapped' },
  ];

  const activities: Activity[] = [
    // Northwind: stage moved to Proposal 23d ago; champion active
    { id: 'a-nw-1', deal_id: 'd-northwind', type: 'stage_change', body: 'Moved to Proposal', occurred_at: tsOffset(-23) },
    { id: 'a-nw-2', deal_id: 'd-northwind', type: 'email', direction: 'in', stakeholder_id: 's-nw-dana', body: 'Dana: "I can get this in front of our COO if we have the integration answer."', occurred_at: tsOffset(-2) },
    { id: 'a-nw-3', deal_id: 'd-northwind', type: 'call', direction: 'out', stakeholder_id: 's-nw-liam', body: 'Walked through reconciliation flow', occurred_at: tsOffset(-6) },
    // Helix: active, but procurement never mapped
    { id: 'a-hx-1', deal_id: 'd-helix', type: 'meeting', direction: 'in', stakeholder_id: 's-hx-marcus', body: 'Security + clinical review planning', occurred_at: tsOffset(-1) },
    { id: 'a-hx-2', deal_id: 'd-helix', type: 'email', direction: 'in', stakeholder_id: 's-hx-priya', body: 'Priya: "What does the legal turnaround look like?"', occurred_at: tsOffset(-3) },
    { id: 'a-hx-3', deal_id: 'd-helix', type: 'note', body: 'Close date moved twice; procurement and security review still not scheduled.', occurred_at: tsOffset(-5) },
    // Crestline: single thread
    { id: 'a-cr-1', deal_id: 'd-crestline', type: 'email', direction: 'in', stakeholder_id: 's-cr-elena', body: 'Elena: "I think we can get to a decision next month."', occurred_at: tsOffset(-2) },
    { id: 'a-cr-2', deal_id: 'd-crestline', type: 'note', body: 'Only Elena engaged so far — no one else on the buying side has surfaced.', occurred_at: tsOffset(-8) },
    // Orbit: silent for ~3 weeks
    { id: 'a-or-1', deal_id: 'd-orbit', type: 'email', direction: 'out', stakeholder_id: 's-or-ravi', body: 'Sent updated proposal', occurred_at: tsOffset(-17) },
    { id: 'a-or-2', deal_id: 'd-orbit', type: 'call', direction: 'out', stakeholder_id: 's-or-sandra', body: 'Left voicemail', occurred_at: tsOffset(-24) },
    { id: 'a-or-3', deal_id: 'd-orbit', type: 'note', body: 'No reply since the proposal. Champion has gone quiet.', occurred_at: tsOffset(-18) },
    // Vantage: competitor in the deal
    { id: 'a-vn-1', deal_id: 'd-vantage', type: 'call', direction: 'in', stakeholder_id: 's-vn-grace', body: 'Grace: "Acme is also pitching us — they came in cheaper."', occurred_at: tsOffset(-12) },
    { id: 'a-vn-2', deal_id: 'd-vantage', type: 'meeting', direction: 'in', stakeholder_id: 's-vn-tom', body: 'Field ops walkthrough', occurred_at: tsOffset(-4) },
    // Kestrel: healthy
    { id: 'a-ks-1', deal_id: 'd-kestrel', type: 'meeting', direction: 'in', stakeholder_id: 's-ks-noah', body: 'Discovery — adoption reporting needs', occurred_at: tsOffset(-1) },
    { id: 'a-ks-2', deal_id: 'd-kestrel', type: 'email', direction: 'in', stakeholder_id: 's-ks-hana', body: 'Hana: "This is a priority for next quarter."', occurred_at: tsOffset(-3) },
    // Beacon: almost nothing
    { id: 'a-bc-1', deal_id: 'd-beacon', type: 'stage_change', body: 'Moved to Proposal', occurred_at: tsOffset(-31) },
  ];

  const events: EngagementEvent[] = [
    { id: 'e-nw-1', deal_id: 'd-northwind', stakeholder_email: 'dana@northwind.example', type: 'room_view', occurred_at: tsOffset(-2), duration_s: 210 },
    { id: 'e-hx-1', deal_id: 'd-helix', stakeholder_email: 'priya@helix.example', type: 'doc_view', ref_id: 'security-pack', occurred_at: tsOffset(-3), duration_s: 340 },
    { id: 'e-vn-1', deal_id: 'd-vantage', stakeholder_email: 'grace@vantage.example', type: 'room_view', occurred_at: tsOffset(-1), duration_s: 180 },
    { id: 'e-ks-1', deal_id: 'd-kestrel', stakeholder_email: 'noah@kestrel.example', type: 'room_view', occurred_at: tsOffset(-1), duration_s: 260 },
  ];

  const plans: PlanMilestone[] = [
    // Northwind — procurement/security done; legal + signature pending (plan is on track)
    { id: 'p-nw-1', deal_id: 'd-northwind', title: 'Security review', type: 'security', owner_side: 'buyer', due_date: dayOffset(-2), status: 'done', depends_on: [], lead_time_days: 15 },
    { id: 'p-nw-2', deal_id: 'd-northwind', title: 'Procurement', type: 'procurement', owner_side: 'buyer', due_date: dayOffset(-1), status: 'done', depends_on: [], lead_time_days: 10 },
    { id: 'p-nw-3', deal_id: 'd-northwind', title: 'Legal redlines', type: 'legal', owner_side: 'buyer', due_date: dayOffset(14), status: 'pending', depends_on: [], lead_time_days: 10 },
    { id: 'p-nw-4', deal_id: 'd-northwind', title: 'Signature', type: 'signature', owner_side: 'buyer', due_date: dayOffset(19), status: 'pending', depends_on: ['p-nw-3'], lead_time_days: 3 },
    // Orbit — plan mapped and on track (so S7 is the story, not procurement)
    { id: 'p-or-1', deal_id: 'd-orbit', title: 'Security review', type: 'security', owner_side: 'buyer', due_date: dayOffset(-3), status: 'done', depends_on: [], lead_time_days: 15 },
    { id: 'p-or-2', deal_id: 'd-orbit', title: 'Legal redlines', type: 'legal', owner_side: 'buyer', due_date: dayOffset(-2), status: 'done', depends_on: [], lead_time_days: 10 },
    { id: 'p-or-3', deal_id: 'd-orbit', title: 'Procurement', type: 'procurement', owner_side: 'buyer', due_date: dayOffset(24), status: 'pending', depends_on: [], lead_time_days: 10 },
    { id: 'p-or-4', deal_id: 'd-orbit', title: 'Signature', type: 'signature', owner_side: 'buyer', due_date: dayOffset(28), status: 'pending', depends_on: [], lead_time_days: 3 },
    // Helix — missing procurement / security / legal (drives S5 + S6)
    { id: 'p-hx-1', deal_id: 'd-helix', title: 'Technical validation', type: 'technical', owner_side: 'buyer', due_date: dayOffset(3), status: 'done', depends_on: [], lead_time_days: 5 },
    { id: 'p-hx-2', deal_id: 'd-helix', title: 'Commercial terms', type: 'commercial', owner_side: 'seller', due_date: dayOffset(5), status: 'pending', depends_on: ['p-hx-1'], lead_time_days: 4 },
    { id: 'p-hx-3', deal_id: 'd-helix', title: 'Signature', type: 'signature', owner_side: 'buyer', due_date: dayOffset(7), status: 'pending', depends_on: ['p-hx-2'], lead_time_days: 3 },
    // Kestrel — complete plan
    { id: 'p-ks-1', deal_id: 'd-kestrel', title: 'Discovery', type: 'discovery', owner_side: 'seller', due_date: dayOffset(5), status: 'pending', depends_on: [], lead_time_days: 5 },
    { id: 'p-ks-2', deal_id: 'd-kestrel', title: 'Security review', type: 'security', owner_side: 'buyer', due_date: dayOffset(20), status: 'pending', depends_on: [], lead_time_days: 15 },
    { id: 'p-ks-3', deal_id: 'd-kestrel', title: 'Legal redlines', type: 'legal', owner_side: 'buyer', due_date: dayOffset(35), status: 'pending', depends_on: [], lead_time_days: 10 },
    { id: 'p-ks-4', deal_id: 'd-kestrel', title: 'Procurement', type: 'procurement', owner_side: 'buyer', due_date: dayOffset(45), status: 'pending', depends_on: [], lead_time_days: 10 },
    { id: 'p-ks-5', deal_id: 'd-kestrel', title: 'Signature', type: 'signature', owner_side: 'buyer', due_date: dayOffset(52), status: 'pending', depends_on: [], lead_time_days: 3 },
  ];

  return { deals, stakeholders, activities, events, plans };
}
