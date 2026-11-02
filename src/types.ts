// Core types for the sync protocol.

export type RecordValue = unknown;

export interface SyncRecord {
  id: string;
  value: RecordValue;
  version: number; // server-assigned, globally increasing; 0 means "never synced"
  deleted: boolean;
}

export type OperationType = "put" | "delete";

export interface Operation {
  id: string;
  type: OperationType;
  value?: RecordValue;
  /** The version the client last saw — the basis for the optimistic check. */
  baseVersion: number;
}

export interface Conflict {
  id: string;
  /** The server version that won; null if the record no longer exists. */
  serverVersion: number | null;
}

export interface SyncReport {
  pushed: number;
  conflicts: Conflict[];
  pulled: number;
}

export type PushResult =
  | { id: string; status: "applied"; version: number }
  | { id: string; status: "conflict"; record: SyncRecord | null };

export interface PullResult {
  changes: SyncRecord[];
  cursor: number;
}

/** The server the engine syncs against (real HTTP in prod, in-memory in tests). */
export interface ServerPort {
  push(op: Operation): PushResult;
  pull(since: number): PullResult;
}
