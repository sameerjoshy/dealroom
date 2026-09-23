import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Layers, ArrowRight } from 'lucide-react';
import type { CoachingCard, PlayRun } from '@dealroom/contracts';
import { useApi } from '../lib/useApi';
import { post } from '../lib/api';
import { CoachingCardView } from '../components/CoachingCard';
import { Empty, ErrorState, PageHead, Spinner, Stat } from '../components/ui';
import { money, relTime } from '../lib/format';

interface TodayData {
  header: { plays_run: number; deals_moved: number; deals_at_risk: number; value_at_risk: number };
  needs_approval: CoachingCard[];
  batches: { play_id: string; play_name: string; count: number; deal_ids: string[]; value: number }[];
  waiting: { card: CoachingCard; run: PlayRun }[];
  moved: { run: PlayRun; deal_name: string; account: string; amount: number }[];
  escalated: { run: PlayRun; deal_name: string; account: string; amount: number }[];
}

export default function Today() {
  const { data, error, loading, reload } = useApi<TodayData>('/today');
  const [busy, setBusy] = useState<string | null>(null);

  const approve = async (c: CoachingCard) => {
    setBusy(c.id);
    try { await post('/play-runs', { deal_id: c.deal_id, play_id: c.play_id, approve: true }); reload(); }
    finally { setBusy(null); }
  };
  const dismiss = async (c: CoachingCard, reason: string) => {
    setBusy(c.id);
    try {
      const run = await post<PlayRun>('/play-runs', { deal_id: c.deal_id, play_id: c.play_id });
      await post(`/play-runs/${run.id}/dismiss`, { reason });
      reload();
    } finally { setBusy(null); }
  };
  const approveBatch = async (play_id: string, deal_ids: string[]) => {
    setBusy(`batch:${play_id}`);
    try { await post('/play-runs/batch-approve', { play_id, deal_ids }); reload(); }
    finally { setBusy(null); }
  };
  const simulate = async (runId: string, outcome: 'moved' | 'not_moved') => {
    setBusy(runId);
    try { await post(`/play-runs/${runId}/simulate`, { outcome }); reload(); }
    finally { setBusy(null); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const nothing = data.needs_approval.length === 0 && data.waiting.length === 0 && data.moved.length === 0 && data.escalated.length === 0;

  return (
    <div>
      <PageHead
        title="Today"
        sub="The deals that need you — highest urgency first. Approve a play and it runs; the room shows whether the deal moved after it."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Stat value={data.header.plays_run} label="Plays run" />
        <Stat value={data.header.deals_moved} label="Deals moved" />
        <Stat value={data.header.deals_at_risk} label="Deals at risk" />
        <Stat value={money(data.header.value_at_risk)} label="Value at risk" />
      </div>

      {data.batches.map((b) => (
        <div key={b.play_id} className="card p-5 mb-4 border-l-4 border-l-accent2 bg-gradient-to-r from-emerald-50/60 to-white">
          <div className="flex flex-wrap items-center gap-3">
            <Layers size={16} className="text-accent2" />
            <p className="font-semibold">
              {b.count} deals have the same stall — <span className="text-slate-600 font-normal">{b.play_name}</span>
            </p>
            <span className="font-mono text-[11px] text-muted ml-auto">{money(b.value)} at stake</span>
            <button className="btn-accent" onClick={() => approveBatch(b.play_id, b.deal_ids)} disabled={busy === `batch:${b.play_id}`}>
              <Check size={14} /> Review &amp; approve all
            </button>
          </div>
        </div>
      ))}

      {nothing && <Empty title="No deal needs you right now." sub="We'll surface the next move the moment a stall appears." />}

      {data.needs_approval.length > 0 && (
        <Section title="Needs approval">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {data.needs_approval.map((c) => (
              <CoachingCardView key={c.id} card={c} busy={busy === c.id} onApprove={() => approve(c)} onDismiss={(r) => dismiss(c, r)} />
            ))}
          </div>
        </Section>
      )}

      {data.waiting.length > 0 && (
        <Section title="Waiting on outcome">
          <div className="space-y-3">
            {data.waiting.map(({ card, run }) => (
              <div key={run.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{card.account} <span className="text-muted font-normal">· {card.play_name}</span></p>
                    <p className="text-xs text-muted">Verifying until {relTime(run.verify_until)} — {card.check}</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button className="btn-ghost" onClick={() => simulate(run.id, 'moved')} disabled={busy === run.id}>Simulate: moved</button>
                    <button className="btn-ghost" onClick={() => simulate(run.id, 'not_moved')} disabled={busy === run.id}>Simulate: no response</button>
                  </div>
                </div>
                {run.steps.some((s) => s.detail) && (
                  <details className="mt-3">
                    <summary className="text-xs font-semibold text-accent2 cursor-pointer">See what ran</summary>
                    <div className="mt-2 space-y-2">
                      {run.steps.map((s, i) => (
                        <div key={i} className="rounded-lg bg-slate-50 border border-line p-3">
                          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">{s.label}</p>
                          <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{s.detail}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.moved.length > 0 && (
        <Section title="Moved after play">
          <div className="space-y-2">
            {data.moved.map(({ run, account, deal_name, amount }) => (
              <div key={run.id} className="card p-4 flex items-center gap-3">
                <Check size={16} className="text-emerald-600" />
                <div>
                  <p className="font-semibold text-sm">{account}</p>
                  <p className="text-xs text-muted">{deal_name} · {run.outcome}</p>
                </div>
                <span className="ml-auto font-mono text-[11px] text-muted">{money(amount)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.escalated.length > 0 && (
        <Section title="Escalated">
          <div className="space-y-2">
            {data.escalated.map(({ run, account, deal_name }) => (
              <div key={run.id} className="card p-4 flex items-center gap-3 border-l-4 border-l-warn">
                <div>
                  <p className="font-semibold text-sm">{account}</p>
                  <p className="text-xs text-muted">{deal_name} · {run.outcome}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="label mb-3">{title}</h2>
      {children}
    </section>
  );
}
