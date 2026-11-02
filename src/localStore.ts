import type { SyncRecord } from "./types.js";

/** The client's local copy of records plus a pull cursor (last server version seen). */
export class LocalStore {
  private readonly records = new Map<string, SyncRecord>();
  cursor = 0;

  get(id: string): SyncRecord | undefined {
    return this.records.get(id);
  }

  all(): SyncRecord[] {
    return [...this.records.values()].filter((r) => !r.deleted);
  }

  version(id: string): number {
    return this.records.get(id)?.version ?? 0;
  }

  upsert(record: SyncRecord): void {
    this.records.set(record.id, { ...record });
  }

  setVersion(id: string, version: number): void {
    const record = this.records.get(id);
    if (record) {
      record.version = version;
    }
  }
}
