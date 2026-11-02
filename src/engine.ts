import { LocalStore } from "./localStore.js";
import { Outbox } from "./outbox.js";
import type { Conflict, RecordValue, ServerPort, SyncReport } from "./types.js";

/**
 * Offline-first sync engine.
 *
 * Local edits apply immediately (optimistic) and queue in the outbox, so the
 * app works with no network. {@link sync} pushes queued ops to the server under
 * optimistic concurrency: accepted ops advance the local version; conflicts mean
 * the server has newer data, so the stale local change is **rejected** and the
 * server's record wins (never the reverse). Then a pull merges server changes
 * into records the client isn't currently editing.
 */
export class SyncEngine {
  readonly local: LocalStore;
  readonly outbox: Outbox;
  private readonly server: ServerPort;

  constructor(server: ServerPort, local = new LocalStore(), outbox = new Outbox()) {
    this.server = server;
    this.local = local;
    this.outbox = outbox;
  }

  put(id: string, value: RecordValue): void {
    const version = this.local.version(id);
    this.local.upsert({ id, value, version, deleted: false });
    this.outbox.enqueue({ id, type: "put", value, baseVersion: version });
  }

  remove(id: string): void {
    const version = this.local.version(id);
    const current = this.local.get(id);
    this.local.upsert({ id, value: current?.value ?? null, version, deleted: true });
    this.outbox.enqueue({ id, type: "delete", baseVersion: version });
  }

  sync(): SyncReport {
    let pushed = 0;
    const conflicts: Conflict[] = [];

    for (const op of this.outbox.items()) {
      const result = this.server.push(op);
      if (result.status === "applied") {
        this.local.setVersion(op.id, result.version);
        this.outbox.remove(op.id);
        pushed += 1;
      } else {
        // Server has newer data: reject the stale local change, take the server's.
        if (result.record) {
          this.local.upsert(result.record);
        }
        this.outbox.remove(op.id);
        conflicts.push({ id: op.id, serverVersion: result.record?.version ?? null });
      }
    }

    const { changes, cursor } = this.server.pull(this.local.cursor);
    let pulled = 0;
    for (const change of changes) {
      // Server wins for records the client isn't actively editing.
      if (!this.outbox.has(change.id)) {
        this.local.upsert(change);
        pulled += 1;
      }
    }
    this.local.cursor = cursor;

    return { pushed, conflicts, pulled };
  }
}
