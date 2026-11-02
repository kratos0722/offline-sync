import type { Operation } from "./types.js";

/**
 * Pending local mutations waiting to be pushed. Coalesces to one op per record
 * (the latest value) while preserving the *original* baseVersion, so a burst of
 * offline edits still checks against the version the client last synced.
 */
export class Outbox {
  private readonly ops = new Map<string, Operation>();

  enqueue(op: Operation): void {
    const existing = this.ops.get(op.id);
    const baseVersion = existing ? existing.baseVersion : op.baseVersion;
    this.ops.set(op.id, { ...op, baseVersion });
  }

  items(): Operation[] {
    return [...this.ops.values()];
  }

  has(id: string): boolean {
    return this.ops.has(id);
  }

  remove(id: string): void {
    this.ops.delete(id);
  }

  get size(): number {
    return this.ops.size;
  }
}
