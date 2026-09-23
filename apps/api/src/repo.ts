// Repository layer. One interface, two implementations:
//   - SupabaseRepo  (dr_ tables, PostgREST) — used when SUPABASE_* is configured
//   - MemoryRepo    (in-process)            — local dev / no DB
// The app only ever talks to this interface, so the store can change freely.

import type {
  Activity, Deal, EngagementEvent, PlanMilestone, PlayRun, Stakeholder,
} from '@dealroom/contracts';
import { store, type AgentRunLog, type Enrichment } from './store';
import { seed, type Seed } from './seed';
import { PLAYS } from './plays';

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  detail?: Record<string, unknown>;
}

export interface Repo {
  listDeals(): Promise<Deal[]>;
  getDealData(dealId: string): Promise<{ deal: Deal; stakeholders: Stakeholder[]; activities: Activity[]; events: EngagementEvent[]; plan: PlanMilestone[] } | null>;
  resetSeed(): Promise<void>;
  upsertDeals(deals: Deal[], stakeholders: Stakeholder[]): Promise<void>;

  listRuns(dealId?: string): Promise<PlayRun[]>;
  getRun(id: string): Promise<PlayRun | null>;
  putRun(run: PlayRun): Promise<PlayRun>;

  getEnrichment(dealId: string): Promise<Enrichment | null>;
  setEnrichment(dealId: string, e: Enrichment): Promise<void>;

  audit(entry: Omit<AuditEntry, 'at'>): Promise<void>;
  listAudit(): Promise<AuditEntry[]>;
  logAgentRun(run: AgentRunLog): Promise<void>;
  listAgentRuns(): Promise<AgentRunLog[]>;
}

// ── Memory ───────────────────────────────────────────────────────────────────
class MemoryRepo implements Repo {
  private current: Seed = seed();

  async listDeals() { return this.current.deals; }
  async getDealData(id: string) {
    const d = this.current;
    const deal = d.deals.find((x) => x.id === id);
    if (!deal) return null;
    return {
      deal,
      stakeholders: d.stakeholders.filter((s) => s.deal_id === id),
      activities: d.activities.filter((a) => a.deal_id === id),
      events: d.events.filter((e) => e.deal_id === id),
      plan: d.plans.filter((p) => p.deal_id === id),
    };
  }
  async resetSeed() { this.current = seed(); store.reset(); }

  async upsertDeals(deals: Deal[], stakeholders: Stakeholder[]) {
    for (const d of deals) {
      const i = this.current.deals.findIndex((x) => x.id === d.id);
      if (i >= 0) this.current.deals[i] = d; else this.current.deals.push(d);
    }
    for (const s of stakeholders) {
      const i = this.current.stakeholders.findIndex((x) => x.id === s.id);
      if (i >= 0) this.current.stakeholders[i] = s; else this.current.stakeholders.push(s);
    }
  }

  async listRuns(dealId?: string) { return store.listRuns(dealId); }
  async getRun(id: string) { return store.getRun(id) ?? null; }
  async putRun(run: PlayRun) { return store.putRun(run); }

  async getEnrichment(dealId: string) { return store.getEnrichment(dealId) ?? null; }
  async setEnrichment(dealId: string, e: Enrichment) { store.setEnrichment(dealId, e); }

  async audit(entry: Omit<AuditEntry, 'at'>) { store.audit(entry); }
  async listAudit() { return store.listAudit(); }
  async logAgentRun(run: AgentRunLog) { store.logAgentRun(run); }
  async listAgentRuns() { return store.listAgentRuns(); }
}

// ── Supabase (PostgREST) ─────────────────────────────────────────────────────
class SupabaseRepo implements Repo {
  constructor(private url: string, private key: string) {}

  private async sb(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(init?.headers ?? {}),
      },
    });
  }
  private async rows<T>(path: string, init?: RequestInit): Promise<T[]> {
    const res = await this.sb(path, init);
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return (await res.json()) as T[];
  }

  async listDeals(): Promise<Deal[]> {
    return this.rows<Deal>('dr_deals?select=*&order=close_date.asc');
  }

  async getDealData(id: string) {
    const rows = await this.rows<Deal & {
      dr_stakeholders: Stakeholder[]; dr_activities: Activity[];
      dr_events: EngagementEvent[]; dr_plan_milestones: PlanMilestone[];
    }>(`dr_deals?id=eq.${encodeURIComponent(id)}&select=*,dr_stakeholders(*),dr_activities(*),dr_events(*),dr_plan_milestones(*)`);
    const r = rows[0];
    if (!r) return null;
    const { dr_stakeholders, dr_activities, dr_events, dr_plan_milestones, ...deal } = r;
    return { deal: deal as Deal, stakeholders: dr_stakeholders ?? [], activities: dr_activities ?? [], events: dr_events ?? [], plan: dr_plan_milestones ?? [] };
  }

  async resetSeed(): Promise<void> {
    // Deleting the workspace's deals cascades to children (stakeholders, activities,
    // events, plan, runs). Then re-seed from the fixtures.
    await this.sb('dr_deals?workspace_id=eq.demo-ws', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    await this.sb('dr_play_runs', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    const s = seed();
    await this.upsert('dr_workspaces', [{ id: 'demo-ws', name: 'GTM-360 Demo', settings: {} }]);
    await this.upsert('dr_plays', PLAYS.map((p) => ({ id: p.id, name: p.name, stalls: p.stalls, definition: p, version: 1 })));
    await this.insert('dr_deals', s.deals, DEAL_COLS);
    await this.insert('dr_stakeholders', s.stakeholders, STAKE_COLS);
    await this.insert('dr_activities', s.activities, ['id', 'deal_id', 'type', 'direction', 'stakeholder_id', 'body', 'occurred_at']);
    await this.insert('dr_events', s.events, ['id', 'deal_id', 'stakeholder_email', 'type', 'ref_id', 'duration_s', 'occurred_at']);
    await this.insert('dr_plan_milestones', s.plans, ['id', 'deal_id', 'title', 'type', 'owner_side', 'owner_contact_id', 'due_date', 'status', 'depends_on', 'lead_time_days', 'sort']);
  }

  private async insert(table: string, rows: unknown[], cols: string[]): Promise<void> {
    if (!rows.length) return;
    const body = rows.map((r) => normalize(r as Record<string, unknown>, cols));
    const res = await this.sb(table, { method: 'POST', body: JSON.stringify(body), headers: { Prefer: 'return=minimal' } });
    if (!res.ok) throw new Error(`Supabase insert ${table} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  private async upsert(table: string, rows: unknown[]): Promise<void> {
    if (!rows.length) return;
    const res = await this.sb(table, { method: 'POST', body: JSON.stringify(rows), headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
    if (!res.ok) throw new Error(`Supabase upsert ${table} ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }

  async upsertDeals(deals: Deal[], stakeholders: Stakeholder[]): Promise<void> {
    await this.upsert('dr_deals', deals.map((d) => normalize(d as unknown as Record<string, unknown>, DEAL_COLS)));
    await this.upsert('dr_stakeholders', stakeholders.map((s) => normalize(s as unknown as Record<string, unknown>, STAKE_COLS)));
  }

  async listRuns(dealId?: string): Promise<PlayRun[]> {
    const q = dealId ? `dr_play_runs?deal_id=eq.${encodeURIComponent(dealId)}&select=*` : 'dr_play_runs?select=*';
    return this.rows<PlayRun>(q);
  }
  async getRun(id: string): Promise<PlayRun | null> {
    const rows = await this.rows<PlayRun>(`dr_play_runs?id=eq.${encodeURIComponent(id)}&select=*`);
    return rows[0] ?? null;
  }
  async putRun(run: PlayRun): Promise<PlayRun> {
    await this.sb('dr_play_runs', { method: 'POST', body: JSON.stringify([run]), headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
    return run;
  }

  async getEnrichment(dealId: string): Promise<Enrichment | null> {
    const rows = await this.rows<{ brief: Enrichment['brief']; meddic: Enrichment['meddic'] }>(`dr_deals?id=eq.${encodeURIComponent(dealId)}&select=brief,meddic`);
    const r = rows[0];
    if (!r || (!r.brief && !r.meddic)) return null;
    return { brief: r.brief ?? undefined, meddic: r.meddic ?? undefined, generated_at: new Date().toISOString() };
  }
  async setEnrichment(dealId: string, e: Enrichment): Promise<void> {
    await this.sb(`dr_deals?id=eq.${encodeURIComponent(dealId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ brief: e.brief ?? null, meddic: e.meddic ?? null }),
      headers: { Prefer: 'return=minimal' },
    });
  }

  async audit(entry: Omit<AuditEntry, 'at'>): Promise<void> {
    await this.sb('dr_audit', { method: 'POST', body: JSON.stringify([{ workspace_id: 'demo-ws', ...entry }]), headers: { Prefer: 'return=minimal' } });
  }
  async listAudit(): Promise<AuditEntry[]> {
    const rows = await this.rows<AuditEntry & { workspace_id: string }>('dr_audit?select=at,actor,action,entity,entity_id,detail&order=at.desc&limit=200');
    return rows;
  }
  async logAgentRun(run: AgentRunLog): Promise<void> {
    await this.sb('dr_agent_runs', { method: 'POST', body: JSON.stringify([run]), headers: { Prefer: 'return=minimal' } });
  }
  async listAgentRuns(): Promise<AgentRunLog[]> {
    return this.rows<AgentRunLog>('dr_agent_runs?select=agent_id,deal_id,valid,tokens,latency_ms,at&order=at.desc&limit=200');
  }
}

export interface RepoEnv { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string }

const DEAL_COLS = ['id', 'workspace_id', 'hubspot_id', 'name', 'account', 'amount', 'stage', 'close_date', 'close_date_history', 'owner_id', 'owner_name', 'template_id', 'meddic', 'created_at'];
const STAKE_COLS = ['id', 'deal_id', 'name', 'email', 'title', 'meddic_role', 'role_confirmed', 'sentiment', 'last_two_way_at', 'engagement_score', 'status'];

/** PostgREST bulk inserts need every row to share the same keys. */
function normalize(row: Record<string, unknown>, cols: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of cols) out[c] = row[c] ?? null;
  return out;
}

export function getRepo(env: RepoEnv): Repo {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseRepo(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return new MemoryRepo();
}
