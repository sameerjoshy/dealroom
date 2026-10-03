// HubSpot integration (single-portal Service Key). Pull deals + contacts +
// associations (with close-date history); write back Notes and Tasks.
// Every call is best-effort — a HubSpot failure never breaks the app.

import type { Activity, Deal, Stakeholder, Stage } from '@dealroom/contracts';

const BASE = 'https://api.hubapi.com';

const EMAIL_PROPS = ['hs_timestamp', 'hs_email_direction', 'hs_email_subject', 'hs_email_text', 'hs_email_from_email', 'hs_email_to_email'];
const CALL_PROPS = ['hs_timestamp', 'hs_call_direction', 'hs_call_title', 'hs_call_body'];
const MEETING_PROPS = ['hs_timestamp', 'hs_meeting_title', 'hs_meeting_body'];

async function hs<T>(key: string, path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) { console.error('[hubspot]', path, res.status, (await res.text()).slice(0, 160)); return null; }
    return (await res.json()) as T;
  } catch (e) {
    console.error('[hubspot]', path, e instanceof Error ? e.message : String(e));
    return null;
  }
}

const STAGE_MAP: Record<string, Stage> = {
  closedwon: 'closed_won', closedlost: 'closed_lost',
  qualifiedtobuy: 'solution', presentationscheduled: 'solution', decisionmakerboughtin: 'proposal',
  contractsent: 'negotiation', 'appointment scheduled': 'discovery',
};

function mapStage(s?: string): Stage {
  if (!s) return 'discovery';
  const k = s.toLowerCase();
  if (STAGE_MAP[k]) return STAGE_MAP[k];
  if (k.includes('won')) return 'closed_won';
  if (k.includes('lost')) return 'closed_lost';
  if (k.includes('contract') || k.includes('negotiat')) return 'negotiation';
  if (k.includes('proposal') || k.includes('decision')) return 'proposal';
  if (k.includes('qualif') || k.includes('present')) return 'solution';
  return 'discovery';
}

interface HsDeal {
  id: string;
  properties: Record<string, string | null>;
}
interface HsContact {
  id: string;
  properties: Record<string, string | null>;
}

interface HsEngagement {
  id: string;
  properties: Record<string, string | null>;
}

/** Deal → associated object ids of a given type (v4 default associations). */
async function associatedIds(key: string, dealId: string, toType: 'emails' | 'calls' | 'meetings'): Promise<string[]> {
  const res = await hs<{ results?: { toObjectId: number | string }[] }>(
    key, `/crm/v4/objects/deals/${dealId}/associations/${toType}?limit=50`,
  );
  return (res?.results ?? []).map((r) => String(r.toObjectId));
}

/** Batch-read objects by id (one call for the whole page). */
async function readBatch(key: string, type: 'emails' | 'calls' | 'meetings', ids: string[], properties: string[]): Promise<HsEngagement[]> {
  if (!ids.length) return [];
  const res = await hs<{ results?: HsEngagement[] }>(key, `/crm/v3/objects/${type}/batch/read`, {
    method: 'POST',
    body: JSON.stringify({ properties, inputs: ids.slice(0, 100).map((id) => ({ id })) }),
  });
  return res?.results ?? [];
}

function toIso(ts?: string | null): string {
  if (!ts) return new Date().toISOString();
  const n = Number(ts);
  return Number.isFinite(n) && ts.length > 8 ? new Date(n).toISOString() : ts;
}

/**
 * Pull logged emails, calls and meetings for a deal as Activities. Only replies,
 * meetings and calls are two-way; these are what the stall rules read. Inbound
 * email is matched back to a mapped contact so the person's last-two-way recency
 * stays honest. Bounded to `limit` engagements per type.
 */
export async function pullEngagements(
  key: string,
  hubspotDealId: string,
  localDealId: string,
  contactByEmail: Map<string, string>,
  limit = 25,
): Promise<{ activities: Activity[]; lastTouch: Map<string, string> }> {
  const activities: Activity[] = [];
  const lastTouch = new Map<string, string>();
  const touch = (stakeholderId: string, at: string) => {
    const prev = lastTouch.get(stakeholderId);
    if (!prev || new Date(at) > new Date(prev)) lastTouch.set(stakeholderId, at);
  };

  const emails = await readBatch(key, 'emails', (await associatedIds(key, hubspotDealId, 'emails')).slice(0, limit), EMAIL_PROPS);
  for (const e of emails) {
    const p = e.properties;
    const at = toIso(p.hs_timestamp);
    const inbound = (p.hs_email_direction ?? '').toUpperCase().startsWith('INCOMING');
    const direction = inbound ? 'in' : 'out';
    activities.push({
      id: `hs_em_${e.id}`, deal_id: localDealId, type: 'email', direction,
      body: (p.hs_email_subject ?? p.hs_email_text ?? 'Email').slice(0, 240), occurred_at: at,
    });
    if (inbound) {
      for (const addr of [p.hs_email_from_email, p.hs_email_to_email]) {
        const sid = addr ? contactByEmail.get(addr.toLowerCase()) : undefined;
        if (sid) touch(sid, at);
      }
    }
  }

  const calls = await readBatch(key, 'calls', (await associatedIds(key, hubspotDealId, 'calls')).slice(0, limit), CALL_PROPS);
  for (const c of calls) {
    const p = c.properties;
    const at = toIso(p.hs_timestamp);
    activities.push({
      id: `hs_call_${c.id}`, deal_id: localDealId, type: 'call',
      direction: (p.hs_call_direction ?? 'OUTBOUND').toUpperCase().startsWith('IN') ? 'in' : 'out',
      body: (p.hs_call_title ?? p.hs_call_body ?? 'Call').slice(0, 240), occurred_at: at,
    });
  }

  const meetings = await readBatch(key, 'meetings', (await associatedIds(key, hubspotDealId, 'meetings')).slice(0, limit), MEETING_PROPS);
  for (const m of meetings) {
    const p = m.properties;
    activities.push({
      id: `hs_mtg_${m.id}`, deal_id: localDealId, type: 'meeting', direction: 'in',
      body: (p.hs_meeting_title ?? p.hs_meeting_body ?? 'Meeting').slice(0, 240), occurred_at: toIso(p.hs_timestamp),
    });
  }

  return { activities, lastTouch };
}

/** Pull open+recent deals (with close-date history) and their contacts. */
export async function pullDeals(key: string, limit = 20): Promise<{ deals: Deal[]; stakeholders: Stakeholder[] }> {
  const list = await hs<{ results: HsDeal[] }>(key, `/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate,hubspot_owner_id`);
  if (!list) return { deals: [], stakeholders: [] };

  const deals: Deal[] = [];
  const stakeholders: Stakeholder[] = [];

  for (const d of list.results) {
    const p = d.properties;
    const dealId = `hs_${d.id}`;
    // Close-date history
    const hist = await hs<{ properties?: { closedate?: { history?: { value: string }[] } } }>(
      key, `/crm/v3/objects/deals/${d.id}?propertiesWithHistory=closedate`,
    );
    const history = (hist?.properties?.closedate?.history ?? [])
      .map((h) => (h.value ? h.value.slice(0, 10) : ''))
      .filter(Boolean)
      .filter((v) => v !== (p.closedate ?? '').slice(0, 10));

    deals.push({
      id: dealId,
      workspace_id: 'demo-ws',
      hubspot_id: d.id,
      name: p.dealname ?? `Deal ${d.id}`,
      account: p.dealname ?? `Deal ${d.id}`,
      amount: Number(p.amount ?? 0),
      stage: mapStage(p.dealstage ?? undefined),
      close_date: (p.closedate ?? new Date().toISOString()).slice(0, 10),
      close_date_history: history,
      owner_id: p.hubspot_owner_id ?? '',
      owner_name: '',
      meddic: {
        metrics: { status: 'empty' }, economic_buyer: { status: 'empty' },
        decision_criteria: { status: 'empty' }, decision_process: { status: 'empty' },
        identify_pain: { status: 'empty' }, champion: { status: 'empty' },
      },
      created_at: new Date().toISOString(),
    });

    // Associated contacts (v4 default associations)
    const assoc = await hs<{ results?: { toObjectId: number | string }[] }>(
      key, `/crm/v4/objects/deals/${d.id}/associations/contacts?limit=20`,
    );
    for (const a of assoc?.results ?? []) {
      const c = await hs<HsContact>(key, `/crm/v3/objects/contacts/${a.toObjectId}?properties=firstname,lastname,email,jobtitle`);
      if (!c) continue;
      const cp = c.properties;
      stakeholders.push({
        id: `hs_${c.id}`, deal_id: dealId,
        name: [cp.firstname, cp.lastname].filter(Boolean).join(' ') || (cp.email ?? `Contact ${c.id}`),
        email: cp.email ?? '', title: cp.jobtitle ?? undefined,
        role_confirmed: false, status: 'unmapped',
      });
    }
  }
  return { deals, stakeholders };
}

/** Write a Note onto a deal (v4 default association). */
export async function writeNote(key: string, hubspotDealId: string, body: string): Promise<boolean> {
  const note = await hs<{ id: string }>(key, '/crm/v3/objects/notes', {
    method: 'POST',
    body: JSON.stringify({ properties: { hs_note_body: body, hs_timestamp: new Date().toISOString() } }),
  });
  if (!note?.id) return false;
  const link = await hs(key, `/crm/v3/objects/notes/${note.id}/associations/deals/${hubspotDealId}/214`, { method: 'PUT' });
  return link !== null;
}

/** Create a Task on a deal (v4 default association). */
export async function createTask(key: string, hubspotDealId: string, title: string, dueInDays = 3): Promise<boolean> {
  const due = new Date(Date.now() + dueInDays * 86_400_000).toISOString();
  const task = await hs<{ id: string }>(key, '/crm/v3/objects/tasks', {
    method: 'POST',
    body: JSON.stringify({ properties: { hs_task_subject: title, hs_task_status: 'NOT_STARTED', hs_timestamp: due } }),
  });
  if (!task?.id) return false;
  const link = await hs(key, `/crm/v3/objects/tasks/${task.id}/associations/deals/${hubspotDealId}/216`, { method: 'PUT' });
  return link !== null;
}
