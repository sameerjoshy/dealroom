import { seed, type Seed } from './seed';

let current: Seed | null = null;

export function data(): Seed {
  if (!current) current = seed();
  return current;
}

export function resetData(): void {
  current = seed();
}
