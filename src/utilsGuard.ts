// F2 — Reentrancy gate for session finalization (and any future single-shot
// operation). Pure and framework-free so it can be unit-tested with tsx.
//
// Purpose: two rapid "Terminer" clicks (or any duplicate programmatic call) must
// be collapsed into a single completion. tryAcquire() is synchronous, so even
// two events arriving back-to-back before the first await can only squeeze
// through the gate once; every later call is ignored until release().

export interface ReentrancyGate {
  tryAcquire(): boolean;
  release(): void;
}

export function createReentrancyGate(): ReentrancyGate {
  let locked = false;
  return {
    tryAcquire(): boolean {
      if (locked) return false;
      locked = true;
      return true;
    },
    release(): void {
      locked = false;
    },
  };
}