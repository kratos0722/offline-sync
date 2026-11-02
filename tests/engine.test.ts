import { describe, expect, it } from "vitest";

import { SyncEngine } from "../src/engine.js";
import { InMemoryServer } from "../src/server.js";

describe("SyncEngine", () => {
  it("queues edits offline without touching the server", () => {
    const engine = new SyncEngine(new InMemoryServer());
    engine.put("n1", { text: "hello" });
    expect(engine.outbox.size).toBe(1);
    expect(engine.local.get("n1")?.value).toEqual({ text: "hello" });
  });

  it("pushes queued ops on sync and clears the outbox", () => {
    const engine = new SyncEngine(new InMemoryServer());
    engine.put("n1", 1);
    engine.put("n2", 2);
    const report = engine.sync();
    expect(report.pushed).toBe(2);
    expect(report.conflicts).toHaveLength(0);
    expect(engine.outbox.size).toBe(0);
    expect(engine.local.version("n1")).toBeGreaterThan(0);
  });

  it("propagates one client's changes to another via pull", () => {
    const server = new InMemoryServer();
    const alice = new SyncEngine(server);
    const bob = new SyncEngine(server);

    alice.put("note", "milk");
    alice.sync();

    const report = bob.sync(); // nothing to push; pulls alice's note
    expect(report.pulled).toBe(1);
    expect(bob.local.get("note")?.value).toBe("milk");
  });

  it("rejects a stale local update on conflict and keeps the server's value", () => {
    const server = new InMemoryServer();
    const alice = new SyncEngine(server);
    const bob = new SyncEngine(server);

    alice.put("note", "alice-value");
    alice.sync(); // server note = alice-value @ v1

    bob.put("note", "bob-value"); // bob never saw v1 -> baseVersion 0
    const report = bob.sync();

    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0].serverVersion).toBe(1);
    expect(bob.local.get("note")?.value).toBe("alice-value"); // server wins
    expect(bob.outbox.size).toBe(0); // stale op dropped, not retried blindly
  });

  it("supports edit -> sync -> edit -> sync with advancing versions", () => {
    const engine = new SyncEngine(new InMemoryServer());
    engine.put("n", "v1");
    engine.sync();
    const firstVersion = engine.local.version("n");

    engine.put("n", "v2");
    engine.sync();
    expect(engine.local.version("n")).toBeGreaterThan(firstVersion);
    expect(engine.local.get("n")?.value).toBe("v2");
    expect(engine.outbox.size).toBe(0);
  });

  it("deletes a record and syncs the tombstone", () => {
    const engine = new SyncEngine(new InMemoryServer());
    engine.put("n", "v1");
    engine.sync();
    engine.remove("n");
    const report = engine.sync();
    expect(report.pushed).toBe(1);
    expect(engine.local.all().find((r) => r.id === "n")).toBeUndefined();
  });
});
