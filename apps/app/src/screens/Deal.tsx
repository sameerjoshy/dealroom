import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Circle, CircleDot, X } from 'lucide-react';
import type { DealRecord, PlayRun, StallFinding } from '@dealroom/contracts';
import { STALLS } from '@dealroom/contracts';
import { useApi } from '../lib/useApi';
import { post } from '../lib/api';
import { CoachingCardView } from '../components/CoachingCard';
import { ConfidenceChip, ErrorState, SeverityChip, Spinner } from '../components/ui';
import { money, date, relTime, daysUntil } from '../lib/format';

const TABS = ['Overview', 'Plan', 'People', 'Activity'] as const;

export default function Deal() {
  const { id = '' } = useParams();
  const { data, error, loading, reload } = useApi<DealRecord>(`/deals/${id}`);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [busy, setBusy] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);

  const enrich = async () => {
    setEnriching(true);
    try { await post(`/deals/${id}/enrich`); reload(); }
    finally { setEnriching(false); }
  };

  const approve = async (dealId: string, playId: string) => {
    setBusy(playId);
    try { await post('/play-runs', { deal_id: dealId, play_id: playId, approve: true }); reload(); }
    finally { setBusy(null); }
  };
  const dismiss = async (dealId: string, playId: string) => {
    setBusy(playId);
    try {
      const run = await post<PlayRun>('/play-runs', { deal_id: dealId, play_id: playId });
      await post(`/play-runs/${run.id}/dismiss`, { reason: 'not now' });
      reload();
    } finally { setBusy(null); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  const { deal } = data;

  return (
    <div>
      <Link to="/deals" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-4">
        <ArrowLeft size={13} /> All deals
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{deal.account}</h1>
          <p className="text-sm text-muted">{deal.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <ConfidenceChip confidence={data.coverage.confidence} />
          <span className="font-mono text-sm">{money(deal.amount)}</span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-line mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 ${tab === t ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <Overview data={data} busy={busy} enriching={enriching} onEnrich={enrich} onApprove={approve} onDismiss={dismiss} />}
      {tab === 'Plan' && <Plan data={data} />}
      {tab === 'People' && <People data={data} />}
      {tab === 'Activity' && <ActivityTab data={data} />}
    </div>
  );
}

function Overview({ data, busy, enriching, onEnrich, onApprove, onDismiss }: {
  data: DealRecord; busy: string | null; enriching: boolean;
  onEnrich: () => void;
  onApprove: (dealId: string, playId: string) => void; onDismiss: (dealId: string, playId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="label">Brief</h2>
            <button className="btn-ghost px-3 py-1 text-xs" onClick={onEnrich} disabled={enriching}>
              {enriching ? 'Writing…' : data.brief ? 'Refresh brief' : 'Generate with agents'}
            </button>
          </div>
          {data.brief ? (
            <ul className="space-y-1.5">
              {data.brief.lines.map((l, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-accent2">•</span>{l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No brief yet — generate one from the record with the deal-room and qualifier agents.</p>
          )}
        </div>

        <h2 className="label">Coaching</h2>
        {data.cards.length === 0 && (
          <div className="card p-5 text-sm text-muted">
            {data.stalls.length === 0
              ? 'No stall detected — this deal is on track.'
              : 'Stalls detected but no built play applies yet. See the findings below.'}
          </div>
        )}
        {data.cards.map((c) => (
          <CoachingCardView key={c.id} card={c} busy={busy === c.play_id}
            onApprove={() => onApprove(c.deal_id, c.play_id)} onDismiss={() => onDismiss(c.deal_id, c.play_id)} />
        ))}

        <h2 className="label pt-2">Stall findings</h2>
        {data.stalls.length === 0 && <p className="text-sm text-muted">None.</p>}
        {data.stalls.map((s) => <Finding key={s.stall_id} finding={s} />)}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="label mb-2">MEDDIC</h2>
          <div className="card divide-y divide-line">
            {data.meddic_strip.map((f) => (
              <div key={f.field} className="flex items-center gap-3 px-4 py-2.5">
                <Status status={f.status} />
                <span className="text-sm font-medium w-32">{f.label}</span>
                <span className="text-xs text-muted truncate">{f.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="label mb-2">Diagnosis coverage</h2>
          <div className="card p-4">
            <p className="text-sm mb-3">
              <span className="font-bold">{data.coverage.available} of {data.coverage.required}</span> signals available.
              {' '}Confidence is the basis of the call, not a hedge.
            </p>
            <div className="space-y-1.5">
              {data.signals.map((s) => (
                <div key={s.key} className="flex items-center gap-2 text-xs">
                  {s.available ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-slate-300" />}
                  <span className={s.available ? 'text-slate-600' : 'text-muted'}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Finding({ finding }: { finding: StallFinding }) {
  const meta = STALLS[finding.stall_id];
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <SeverityChip severity={finding.severity}>{meta.name}</SeverityChip>
        <span className="text-[11px] text-muted">{finding.confidence} confidence</span>
      </div>
      {finding.evidence.map((e, i) => (
        <p key={i} className="text-sm text-slate-600 flex items-start gap-2">
          <CircleDot size={13} className="mt-0.5 text-muted shrink-0" /> {e.excerpt}
        </p>
      ))}
    </div>
  );
}

function Plan({ data }: { data: DealRecord }) {
  const r = data.reality;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h2 className="label mb-2">Close plan</h2>
        <div className="card divide-y divide-line">
          {data.plan.length === 0 && <p className="px-4 py-4 text-sm text-muted">No milestones yet.</p>}
          {data.plan.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              {m.status === 'done' ? <Check size={15} className="text-emerald-600" /> : <Circle size={15} className="text-slate-300" />}
              <div className="min-w-0">
                <p className="text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted">{m.type} · {m.owner_side} · due {date(m.due_date)}</p>
              </div>
              <span className="ml-auto text-[11px] text-muted">{m.status}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="label mb-2">Reality check</h2>
        <div className={`card p-4 ${r.ok ? '' : 'border-l-4 border-l-critical'}`}>
          <p className="text-sm">
            {r.ok
              ? 'The plan can finish before the close date.'
              : 'The plan cannot finish before the CRM close date.'}
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="CRM close date" value={date(data.deal.close_date)} />
            <Row label="Earliest achievable" value={date(r.earliest)} />
            <Row label="Lead time needed" value={`${r.needed_business_days} business days`} />
          </div>
          {r.missing.length > 0 && (
            <p className="text-xs text-muted mt-3">Not yet planned: {r.missing.join(', ')}.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function People({ data }: { data: DealRecord }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {data.stakeholders.map((s) => (
        <div key={s.id} className="card p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{s.name}</p>
            {s.meddic_role && (
              <span className={`chip ${s.role_confirmed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                {s.role_confirmed ? '' : 'suggested: '}{s.meddic_role.replace('_', ' ')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted">{s.title ?? '—'}</p>
          <div className="mt-3 text-xs text-slate-600 space-y-1">
            <div>Last two-way: {relTime(s.last_two_way_at)}</div>
            <div>Engagement: {s.engagement_score ?? '—'}</div>
            <div className="capitalize">Sentiment: {s.sentiment ?? '—'}</div>
          </div>
        </div>
      ))}
      {data.stakeholders.length === 0 && <p className="text-sm text-muted">No contacts mapped.</p>}
    </div>
  );
}

function ActivityTab({ data }: { data: DealRecord }) {
  const items = [
    ...data.activities.map((a) => ({ at: a.occurred_at, kind: a.type, text: a.body ?? a.type, who: a.direction })),
    ...data.events.map((e) => ({ at: e.occurred_at, kind: 'room', text: `${e.stakeholder_email} · ${e.type}`, who: undefined as string | undefined })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="card divide-y divide-line">
      {items.length === 0 && <p className="px-4 py-4 text-sm text-muted">No activity yet.</p>}
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-slate-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-slate-700">{it.text}</p>
            <p className="text-xs text-muted">{it.kind}{it.who ? ` · ${it.who}` : ''} · {relTime(it.at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted text-xs">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Status({ status }: { status: 'filled' | 'thin' | 'empty' }) {
  const cls = status === 'filled' ? 'bg-emerald-500' : status === 'thin' ? 'bg-amber-500' : 'bg-slate-300';
  return <span className={`h-2 w-2 rounded-full ${cls}`} />;
}
