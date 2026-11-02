import { describe, expect, it } from "vitest";

import { InMemoryServer } from "../src/server.js";

describe("InMemoryServer optimistic concurrency", () => {
  it("applies a create at baseVersion 0 and assigns version 1", () => {
    const server = new InMemoryServer();
    const res = server.push({ id: "a", type: "put", value: "x", baseVersion: 0 });
    expect(res).toEqual({ id: "a", status: "applied", version: 1 });
  });

  it("rejects a stale update and returns the server record", () => {
    const server = new InMemoryServer();
    server.push({ id: "a", type: "put", value: "x", baseVersion: 0 }); // -> v1
    const res = server.push({ id: "a", type: "put", value: "y", baseVersion: 0 }); // stale
    expect(res.status).toBe("conflict");
    if (res.status === "conflict") {
      expect(res.record?.version).toBe(1);
      expect(res.record?.value).toBe("x");
    }
  });

  it("pull returns only changes after the cursor, in version order", () => {
    const server = new InMemoryServer();
    server.push({ id: "a", type: "put", value: 1, baseVersion: 0 }); // v1
    server.push({ id: "b", type: "put", value: 2, baseVersion: 0 }); // v2
    const { changes, cursor } = server.pull(1);
    expect(changes.map((c) => c.id)).toEqual(["b"]);
    expect(cursor).toBe(2);
  });
});
