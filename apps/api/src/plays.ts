// The play library. A play is data: trigger stall → steps → success → fallback.
// 6 plays are built in full; the rest are viewable YAML (spec §6.2).

import type {
  CoachingCard, Coverage, Deal, Play, StallFinding, StallId,
} from '@dealroom/contracts';
import { STALLS } from '@dealroom/contracts';
import { daysBetween } from './lib/util';

export const PLAYS: Play[] = [
  {
    id: 'P-CHAMPION-TEST', name: 'Test the champion with a real ask', stalls: ['S1'], built: true,
    preconditions: ['at least one mapped contact'],
    steps: [
      { type: 'draft_email', label: 'Draft an email asking the likely champion to take one specific internal action' },
      { type: 'plan_update', label: 'Add a plan milestone for the action (buyer-owned, 10 days)' },
      { type: 'hubspot_task', label: 'Create a HubSpot task to follow up' },
    ],
    success_summary: 'The buyer completes the internal action within 10 days.',
    window_days: 10, fallback: 'P-CHAMPION-ALT',
  },
  {
    id: 'P-EB-VIA-CHAMPION', name: 'Reach the economic buyer through the champion', stalls: ['S2'], built: true,
    preconditions: ['has champion'],
    steps: [
      { type: 'draft_email', label: 'Draft an email asking the champion to broker a 20-minute meeting with the economic buyer' },
      { type: 'generate_asset', label: 'Generate a one-page exec summary into the champion kit' },
      { type: 'plan_update', label: 'Add an "EB alignment call" milestone (buyer-owned, 7 days)' },
      { type: 'hubspot_task', label: 'Create a HubSpot task to follow up' },
    ],
    success_summary: 'The economic buyer meets or views the room within 7 days.',
    window_days: 7, fallback: 'P-EB-DIRECT-EXEC-SPONSOR',
  },
  {
    id: 'P-MULTI-THREAD', name: 'Open a second thread', stalls: ['S3'], built: true,
    preconditions: ['fewer than two active buyer contacts'],
    steps: [
      { type: 'draft_email', label: 'Draft two role-targeted intro emails to likely stakeholders' },
      { type: 'plan_update', label: 'Add a "multi-thread check" milestone (seller-owned, 5 days)' },
      { type: 'hubspot_task', label: 'Create a HubSpot task to invite them to the room' },
    ],
    success_summary: 'At least one new buyer contact becomes active within 14 days.',
    window_days: 14, fallback: 'P-CHAMPION-TEST',
  },
  {
    id: 'P-PROCUREMENT-PREWIRE', name: 'Pre-wire procurement, security and legal', stalls: ['S5'], built: true,
    preconditions: ['stage is proposal or later'],
    steps: [
      { type: 'plan_update', label: 'Insert procurement, security and legal milestones from the enterprise template' },
      { type: 'generate_asset', label: 'Publish the security pack into the room documents' },
      { type: 'draft_email', label: 'Draft an email asking for the procurement and security contacts' },
      { type: 'hubspot_task', label: 'Create a HubSpot task to confirm the review owners' },
    ],
    success_summary: 'A procurement contact is added, or the review milestones are accepted within 7 days.',
    window_days: 7,
  },
  {
    id: 'P-BREAK-SILENCE', name: 'Break the silence with value, not a check-in', stalls: ['S7'], built: true,
    preconditions: ['deal has gone quiet'],
    steps: [
      { type: 'draft_email', label: 'Draft a value-add "give" email (a relevant insight, not a nudge)' },
      { type: 'draft_email', label: 'Draft an alt-contact email to a second stakeholder' },
      { type: 'hubspot_task', label: 'Create a HubSpot task to call in three days if still silent' },
    ],
    success_summary: 'Any two-way buyer activity within 7 days.',
    window_days: 7, fallback: 'P-MULTI-THREAD',
  },
  {
    id: 'P-DIFFERENTIATE', name: 'Differentiate against the competitor', stalls: ['S8'], built: true,
    preconditions: ['a competitor is named in the deal'],
    steps: [
      { type: 'generate_asset', label: 'Generate a competitive talk track + a relevant proof point into the room' },
      { type: 'draft_email', label: 'Draft an email with the case study that reframes the comparison' },
      { type: 'hubspot_task', label: 'Create a HubSpot task to review positioning before the next call' },
    ],
    success_summary: 'The proof asset is viewed and the buyer replies within 10 days.',
    window_days: 10,
  },

  // ── Viewable only (YAML in the Plays library) ──────────────────────────────
  {
    id: 'P-CHAMPION-ALT', name: 'Find a second champion candidate', stalls: ['S1'], built: false,
    preconditions: ['champion is not responding'], steps: [], success_summary: 'A new contact engages within 10 days.', window_days: 10,
    yaml: 'id: P-CHAMPION-ALT\nstalls: [S1]\nsteps:\n  - draft_email: to second candidate\n  - room_invite\nsuccess: { new_contact_engages: true, window_days: 10 }',
  },
  {
    id: 'P-EB-DIRECT-EXEC-SPONSOR', name: 'Exec-to-exec approach to the buyer', stalls: ['S2'], built: false,
    preconditions: ['champion cannot open the EB door'], steps: [], success_summary: 'The EB replies within 10 days.', window_days: 10,
    yaml: 'id: P-EB-DIRECT-EXEC-SPONSOR\nstalls: [S2]\nsteps:\n  - draft_email: exec to exec\n  - hubspot_task: for the seller leader\nsuccess: { eb_reply: true, window_days: 10 }',
  },
  {
    id: 'P-COMPELLING-EVENT', name: 'Create a compelling event', stalls: ['S4'], built: false,
    preconditions: ['no forcing event'], steps: [], success_summary: 'A compelling event is captured within 10 days.', window_days: 10,
    yaml: 'id: P-COMPELLING-EVENT\nstalls: [S4]\nsteps:\n  - generate_asset: cost_of_delay\n  - draft_email: confirm the business date\nsuccess: { compelling_event_captured: true, window_days: 10 }',
  },
  {
    id: 'P-CLOSE-PLAN-RESET', name: 'Reset the close plan to reality', stalls: ['S6'], built: false,
    preconditions: ['critical path exceeds the close date'], steps: [], success_summary: 'The buyer accepts a re-dated plan within 7 days.', window_days: 7,
    yaml: 'id: P-CLOSE-PLAN-RESET\nstalls: [S6]\nsteps:\n  - plan_update: re-date milestones\n  - draft_email: propose a joint plan review\n  - hubspot_task: propose a new close date (rep updates CRM)\nnote: never writes the close date\nsuccess: { plan_accepted: true, window_days: 7 }',
  },
  {
    id: 'P-COMMERCIAL-TRADE', name: 'Make a commercial trade, not a discount', stalls: ['S9'], built: false,
    preconditions: ['discount requested'], steps: [], success_summary: 'A commercial call is booked within 7 days.', window_days: 7,
    yaml: 'id: P-COMMERCIAL-TRADE\nstalls: [S9]\nsteps:\n  - generate_asset: give_get_options\n  - draft_email: propose a commercial call\nsuccess: { meeting_booked: true, window_days: 7 }',
  },
];

export const PLAY_BY_ID: Record<string, Play> = Object.fromEntries(PLAYS.map((p) => [p.id, p]));

const STALL_PLAY: Record<StallId, string> = {
  S1: 'P-CHAMPION-TEST', S2: 'P-EB-VIA-CHAMPION', S3: 'P-MULTI-THREAD',
  S4: 'P-COMPELLING-EVENT', S5: 'P-PROCUREMENT-PREWIRE', S6: 'P-CLOSE-PLAN-RESET',
  S7: 'P-BREAK-SILENCE', S8: 'P-DIFFERENTIATE', S9: 'P-COMMERCIAL-TRADE',
};

const SEVERITY_WEIGHT: Record<string, number> = { critical: 3, high: 2, medium: 1 };

function timeBucket(closeDate: string): number {
  const d = daysBetween(new Date(), closeDate);
  return d <= 14 ? 3 : d <= 30 ? 2 : 1;
}

/** Build an actionable coaching card for a fired stall (built plays only). */
export function cardFor(deal: Deal, stall: StallFinding, coverage: Coverage): CoachingCard | null {
  const play = PLAY_BY_ID[STALL_PLAY[stall.stall_id]];
  if (!play || !play.built) return null;
  const urgency = (SEVERITY_WEIGHT[stall.severity] ?? 1) * timeBucket(deal.close_date);
  return {
    id: `card_${deal.id}_${stall.stall_id}`,
    deal_id: deal.id,
    deal_name: deal.name,
    account: deal.account,
    amount: deal.amount,
    close_date: deal.close_date,
    play_id: play.id,
    play_name: play.name,
    stall,
    coverage,
    why: stall.evidence[0]?.excerpt ?? STALLS[stall.stall_id].description,
    will_do: play.steps.map((s) => s.label),
    check: play.success_summary,
    urgency,
  };
}
