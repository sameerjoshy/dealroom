// Demo state store.
//
// Step 1 keeps play runs, enrichment, and audit in module memory (fine for
// `wrangler dev` and a single demo session). The Supabase `dr_` schema in
// `migrations/` is the intended durable store — swapping this file is the change.

import type { PlayRun } from '@dealroom/contracts';

export interface Enrichment {
  brief?: { lines: string[]; generated_at: string };
  meddic?: Record<string, { value: string; status: 'filled' | 'thin' | 'empty'; evidence_ref?: string }>;
  generated_at: string;
}

export interface AgentRunLog {
  agent_id: string;
  deal_id: string;
  valid: boolean;
  tokens: number;
  latency_ms: number;
  at: string;
}

interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  detail?: Record<string, unknown>;
}

interface State {
  runs: Map<string, PlayRun>;
  enrich: Map<string, Enrichment>;
  agentRuns: AgentRunLog[];
  audit: AuditEntry[];
}

const state: State = { runs: new Map(), enrich: new Map(), agentRuns: [], audit: [] };

export const store = {
  listRuns(dealId?: string): PlayRun[] {
    const all = [...state.runs.values()];
    return dealId ? all.filter((r) => r.deal_id === dealId) : all;
  },
  getRun(id: string): PlayRun | undefined {
    return state.runs.get(id);
  },
  putRun(run: PlayRun): PlayRun {
    state.runs.set(run.id, run);
    return run;
  },
  getEnrichment(dealId: string): Enrichment | undefined {
    return state.enrich.get(dealId);
  },
  setEnrichment(dealId: string, e: Enrichment): void {
    state.enrich.set(dealId, e);
  },
  logAgentRun(run: AgentRunLog): void {
    state.agentRuns.push(run);
  },
  listAgentRuns(): AgentRunLog[] {
    return [...state.agentRuns];
  },
  audit(entry: Omit<AuditEntry, 'at'>): void {
    state.audit.push({ at: new Date().toISOString(), ...entry });
  },
  listAudit(): AuditEntry[] {
    return [...state.audit].reverse();
  },
  reset(): void {
    state.runs.clear();
    state.enrich.clear();
    state.agentRuns.length = 0;
    state.audit.length = 0;
  },
};
