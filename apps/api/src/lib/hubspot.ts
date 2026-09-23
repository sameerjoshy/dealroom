// HubSpot integration (single-portal Service Key). Pull deals + contacts +
// associations (with close-date history); write back Notes and Tasks.
// Every call is best-effort — a HubSpot failure never breaks the app.

import type { Deal, Stakeholder, Stage } from '@dealroom/contracts';

const BASE = 'https://api.hubapi.com';

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
