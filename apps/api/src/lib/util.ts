// Small utilities: ids, dates, business-day math.

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const DAY = 86_400_000;

export function nowIso(): string {
  return new Date().toISOString();
}

export function iso(d: Date): string {
  return d.toISOString();
}

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY);
}

/** ISO date (yyyy-mm-dd) for a day offset from today. */
export function dayOffset(days: number): string {
  return addDays(new Date(), days).toISOString().slice(0, 10);
}

/** ISO timestamp for a day offset from now (negative = past). */
export function tsOffset(days: number): string {
  return addDays(new Date(), days).toISOString();
}

/** Whole days between two instants (b - a). */
export function daysBetween(a: string | Date, b: string | Date = new Date()): number {
  const x = typeof a === 'string' ? new Date(a) : a;
  const y = typeof b === 'string' ? new Date(b) : b;
  return Math.floor((y.getTime() - x.getTime()) / DAY);
}

/** Business days between two instants (skips weekends; no holidays in the demo). */
export function businessDaysBetween(a: string | Date, b: string | Date = new Date()): number {
  let x = typeof a === 'string' ? new Date(a) : new Date(a.getTime());
  const y = typeof b === 'string' ? new Date(b) : new Date(b.getTime());
  if (x > y) return -businessDaysBetween(y, x);
  let count = 0;
  const cur = new Date(x.getTime());
  while (cur < y) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/** Add business days to a date. */
export function addBusinessDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}
