export interface StatePatch {
  path: (string | number)[];
  value?: unknown;
  remove?: boolean;
}
export function diffState(previous: unknown, next: unknown): StatePatch[];
export function applyStatePatch<T>(state: T, patches: StatePatch[]): T;
