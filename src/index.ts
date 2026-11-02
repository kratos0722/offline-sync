import { InMemoryServer } from "./server.js";
import { SyncEngine } from "./engine.js";

// Small demo: two clients against one server, showing offline edits, a sync,
// a pull, and a conflict.
function main(): void {
  const server = new InMemoryServer();
  const alice = new SyncEngine(server);
  const bob = new SyncEngine(server);

  // Alice works offline, then syncs.
  alice.put("note-1", { text: "Buy milk" });
  console.log("alice outbox before sync:", alice.outbox.size);
  console.log("alice sync:", alice.sync());

  // Bob pulls Alice's note.
  console.log("bob sync (pull):", bob.sync());
  console.log("bob sees note-1:", bob.local.get("note-1")?.value);

  // Both edit the same note offline; Alice syncs first, Bob conflicts.
  alice.put("note-1", { text: "Buy oat milk" });
  bob.put("note-1", { text: "Buy almond milk" });
  console.log("alice sync:", alice.sync());
  console.log("bob sync (conflict expected):", bob.sync());
  console.log("bob's note-1 after conflict (server wins):", bob.local.get("note-1")?.value);
}

main();
