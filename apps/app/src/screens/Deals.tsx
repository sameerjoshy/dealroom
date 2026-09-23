import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Coverage, Severity, Stage } from '@dealroom/contracts';
import { useApi } from '../lib/useApi';
import { ConfidenceChip, ErrorState, PageHead, SeverityChip, Spinner } from '../components/ui';
import { money, date, daysUntil } from '../lib/format';

interface Row {
  id: string; name: string; account: string; amount: number; stage: Stage; close_date: string;
  coverage: Coverage;
  top_stall: { id: string; name: string; severity: Severity } | null;
  stall_count: number;
}

const STAGE_LABEL: Record<string, string> = {
  discovery: 'Discovery', solution: 'Solution', proposal: 'Proposal', negotiation: 'Negotiation',
  closed_won: 'Won', closed_lost: 'Lost',
};

export default function Deals() {
  const { data, error, loading, reload } = useApi<Row[]>('/deals');
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const sorted = [...data].sort((a, b) => {
    const sev = (r: Row) => (r.top_stall?.severity === 'critical' ? 0 : r.top_stall ? 1 : 2);
    return sev(a) - sev(b) || daysUntil(a.close_date) - daysUntil(b.close_date);
  });

  return (
    <div>
      <PageHead title="Deals" sub="Every open deal with its stall read and diagnosis coverage. Coverage is confidence — thin data is stated, never hidden." />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-line">
              <th className="px-4 py-3 label font-normal">Deal</th>
              <th className="px-4 py-3 label font-normal">Stage</th>
              <th className="px-4 py-3 label font-normal">Close</th>
              <th className="px-4 py-3 label font-normal">Stall</th>
              <th className="px-4 py-3 label font-normal">Coverage</th>
              <th className="px-4 py-3 label font-normal text-right">Amount</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.id} className="border-b border-line/70 hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <Link to={`/deals/${d.id}`} className="font-semibold hover:text-accent2">{d.account}</Link>
                  <div className="text-xs text-muted">{d.name}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{STAGE_LABEL[d.stage] ?? d.stage}</td>
                <td className="px-4 py-3 text-slate-600">{date(d.close_date)} <span className="text-muted">· {Math.max(0, daysUntil(d.close_date))}d</span></td>
                <td className="px-4 py-3">
                  {d.top_stall ? (
                    <div className="flex items-center gap-2">
                      <SeverityChip severity={d.top_stall.severity}>{d.top_stall.name}</SeverityChip>
                      {d.stall_count > 1 && <span className="text-[11px] text-muted">+{d.stall_count - 1}</span>}
                    </div>
                  ) : (
                    <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">On track</span>
                  )}
                </td>
                <td className="px-4 py-3"><ConfidenceChip confidence={d.coverage.confidence} /></td>
                <td className="px-4 py-3 text-right font-mono text-xs">{money(d.amount)}</td>
                <td className="px-2 py-3"><Link to={`/deals/${d.id}`}><ArrowRight size={15} className="text-muted hover:text-ink" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
