import { describe, expect, it } from "vitest";

import { Outbox } from "../src/outbox.js";

describe("Outbox", () => {
  it("coalesces to the latest op per id but keeps the original baseVersion", () => {
    const outbox = new Outbox();
    outbox.enqueue({ id: "a", type: "put", value: 1, baseVersion: 3 });
    outbox.enqueue({ id: "a", type: "put", value: 2, baseVersion: 99 }); // later edit
    expect(outbox.size).toBe(1);
    const [op] = outbox.items();
    expect(op.value).toBe(2);
    expect(op.baseVersion).toBe(3); // basis preserved from the first queued edit
  });

  it("removes ops", () => {
    const outbox = new Outbox();
    outbox.enqueue({ id: "a", type: "put", value: 1, baseVersion: 0 });
    outbox.remove("a");
    expect(outbox.size).toBe(0);
    expect(outbox.has("a")).toBe(false);
  });
});
