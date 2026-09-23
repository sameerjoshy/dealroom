import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Confidence, Severity } from '@dealroom/contracts';

const SEV: Record<Severity, string> = {
  critical: 'text-critical bg-red-50 border-red-200',
  high: 'text-warn bg-amber-50 border-amber-200',
  medium: 'text-slate-600 bg-slate-100 border-slate-200',
};

const CONF: Record<Confidence, string> = {
  high: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-slate-600 bg-slate-100 border-slate-200',
};

export const SeverityChip = ({ severity, children }: { severity: Severity; children?: ReactNode }) => (
  <span className={`chip ${SEV[severity]}`}>{children ?? severity}</span>
);

export const ConfidenceChip = ({ confidence }: { confidence: Confidence }) => (
  <span className={`chip ${CONF[confidence]}`}>{confidence} confidence</span>
);

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="label mt-0.5">{label}</div>
    </div>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-muted mt-1 max-w-2xl">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted py-16 justify-center">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-8 text-center">
      <AlertTriangle className="mx-auto text-warn mb-3" />
      <p className="font-semibold">Something went wrong</p>
      <p className="text-sm text-muted mt-1">{message}</p>
      {onRetry && <button className="btn-ghost mt-4" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="font-semibold">{title}</p>
      {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
    </div>
  );
}
