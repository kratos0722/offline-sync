import type { Operation, PullResult, PushResult, ServerPort, SyncRecord } from "./types.js";

/**
 * Authoritative server with optimistic concurrency. Every applied change gets a
 * globally increasing version; a push is accepted only if its baseVersion
 * matches the record's current version, otherwise it's a conflict and the
 * server's record wins.
 */
export class InMemoryServer implements ServerPort {
  private readonly records = new Map<string, SyncRecord>();
  private seq = 0;

  push(op: Operation): PushResult {
    const current = this.records.get(op.id);
    const currentVersion = current?.version ?? 0;

    if (op.baseVersion !== currentVersion) {
      return { id: op.id, status: "conflict", record: current ? { ...current } : null };
    }

    this.seq += 1;
    const record: SyncRecord = {
      id: op.id,
      value: op.type === "delete" ? (current?.value ?? null) : op.value,
      version: this.seq,
      deleted: op.type === "delete",
    };
    this.records.set(op.id, record);
    return { id: op.id, status: "applied", version: this.seq };
  }

  pull(since: number): PullResult {
    const changes = [...this.records.values()]
      .filter((r) => r.version > since)
      .sort((a, b) => a.version - b.version)
      .map((r) => ({ ...r }));
    return { changes, cursor: this.seq };
  }
}
