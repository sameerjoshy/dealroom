import { useState } from 'react';
import { Check, Pencil, X, Loader2 } from 'lucide-react';
import type { CoachingCard } from '@dealroom/contracts';
import { STALLS } from '@dealroom/contracts';
import { ConfidenceChip, SeverityChip } from './ui';
import { money, daysUntil } from '../lib/format';

export function CoachingCardView({
  card, onApprove, onDismiss, busy,
}: {
  card: CoachingCard;
  onApprove: () => void;
  onDismiss: (reason: string) => void;
  busy?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const stall = STALLS[card.stall.stall_id];

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <SeverityChip severity={card.stall.severity}>{stall.name}</SeverityChip>
        <ConfidenceChip confidence={card.stall.confidence} />
        <span className="chip border-line bg-white text-muted">
          {card.coverage.available}/{card.coverage.required} signals
        </span>
        <span className="ml-auto font-mono text-[11px] text-muted">
          {money(card.amount)} · closes in {Math.max(0, daysUntil(card.close_date))}d
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <h3 className="font-semibold">{card.account}</h3>
        <span className="text-xs text-muted">{card.deal_name}</span>
      </div>

      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{card.why}</p>

      <button className="mt-2 text-xs font-semibold text-accent2 hover:underline" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide plan' : `Will do ${card.will_do.length} things — see them`}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {card.will_do.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <Check size={14} className="mt-0.5 text-accent2 shrink-0" /> {w}
            </li>
          ))}
          <li className="text-xs text-muted pt-1">Check: {card.check}</li>
        </ul>
      )}

      {editing && (
        <div className="mt-3 rounded-lg bg-slate-50 border border-line p-3 text-xs text-muted">
          Edit removes any step you don't want before approving. (Inline editing lands with the agents step.)
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button className="btn-accent" onClick={onApprove} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
        </button>
        <button className="btn-ghost" onClick={() => setEditing((e) => !e)}>
          <Pencil size={14} /> Edit
        </button>
        <button className="btn-ghost" onClick={() => onDismiss('not now')}>
          <X size={14} /> Dismiss
        </button>
      </div>
    </div>
  );
}
