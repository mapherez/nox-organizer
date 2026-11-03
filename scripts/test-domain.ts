/**
 * Domain logic tests — run with: npx tsx scripts/test-domain.ts
 *
 * Covers the correctness-critical parts of the spec:
 *  - status transitions (§7)
 *  - dependency cycle prevention (§8.3)
 *  - ready/blocked/next-up computation (§6.3, §6.4)
 *  - queue position arithmetic (§24)
 */
import assert from "node:assert/strict";

import { canStart, canTransition } from "../lib/domain/status";
import { buildBlockedByMap, wouldCreateCycle } from "../lib/domain/dependencies";
import {
  buildQueueModel,
  nextPosition,
  orderedQueued,
  positionBetween,
  renormalizedPositions,
} from "../lib/domain/queue";
import type { ItemView, Status } from "../lib/domain/types";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

/** Build a minimal ItemView for tests. */
function item(overrides: Partial<ItemView> & { id: string }): ItemView {
  return {
    kind: "project",
    title: overrides.id,
    description: null,
    status: "queued",
    position: null,
    linkedProjectId: null,
    linkedProjectTitle: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    blockedBy: [],
    blocks: [],
    linkedIdeas: [],
    ...overrides,
  };
}

const ref = (id: string, status: Status = "queued") => ({
  id,
  kind: "project" as const,
  title: id,
  status,
});

console.log("status transitions (§7)");

test("allowed transitions are accepted", () => {
  assert.equal(canTransition("backlog", "queued"), true);
  assert.equal(canTransition("backlog", "dropped"), true);
  assert.equal(canTransition("queued", "in_progress"), true);
  assert.equal(canTransition("queued", "backlog"), true);
  assert.equal(canTransition("queued", "dropped"), true);
  assert.equal(canTransition("in_progress", "done"), true);
  assert.equal(canTransition("in_progress", "queued"), true);
  assert.equal(canTransition("in_progress", "dropped"), true);
  assert.equal(canTransition("done", "in_progress"), true);
  assert.equal(canTransition("done", "dropped"), true);
  assert.equal(canTransition("dropped", "backlog"), true);
});

test("unlisted transitions are rejected", () => {
  assert.equal(canTransition("backlog", "in_progress"), false);
  assert.equal(canTransition("backlog", "done"), false);
  assert.equal(canTransition("queued", "done"), false);
  assert.equal(canTransition("in_progress", "backlog"), false);
  assert.equal(canTransition("in_progress", "dropped"), true);
  assert.equal(canTransition("done", "queued"), false);
  assert.equal(canTransition("done", "backlog"), false);
  assert.equal(canTransition("dropped", "queued"), false);
  assert.equal(canTransition("dropped", "done"), false);
  assert.equal(canTransition("queued", "queued"), false);
});

test("canStart requires all prerequisites satisfied (§7/§8.4)", () => {
  assert.equal(canStart([]), true);
  assert.equal(canStart([{ prerequisiteStatus: "done" }]), true);
  assert.equal(canStart([{ prerequisiteStatus: "dropped" }]), true);
  assert.equal(canStart([{ prerequisiteStatus: "queued" }]), false);
  assert.equal(canStart([{ prerequisiteStatus: "backlog" }]), false);
  assert.equal(canStart([{ prerequisiteStatus: "in_progress" }]), false);
  assert.equal(
    canStart([
      { prerequisiteStatus: "done" },
      { prerequisiteStatus: "in_progress" },
    ]),
    false,
  );
});

console.log("\ncycle prevention (§8.3)");

test("self-dependency is a cycle", () => {
  assert.equal(wouldCreateCycle("a", "a", new Map()), true);
});

test("no cycle on a simple chain", () => {
  // a blocked by b; adding b blocked by c is fine.
  const map = buildBlockedByMap([{ itemId: "a", prerequisiteId: "b" }]);
  assert.equal(wouldCreateCycle("b", "c", map), false);
});

test("direct cycle is rejected", () => {
  const map = buildBlockedByMap([{ itemId: "a", prerequisiteId: "b" }]);
  assert.equal(wouldCreateCycle("b", "a", map), true);
});

test("indirect cycle is rejected", () => {
  // a → b, b → c ; adding c → a closes the loop.
  const map = buildBlockedByMap([
    { itemId: "a", prerequisiteId: "b" },
    { itemId: "b", prerequisiteId: "c" },
  ]);
  assert.equal(wouldCreateCycle("c", "a", map), true);
});

test("diamond is not a cycle", () => {
  // d → b, d → c, b → a, c → a ; adding b → c is fine (both feed a).
  const map = buildBlockedByMap([
    { itemId: "d", prerequisiteId: "b" },
    { itemId: "d", prerequisiteId: "c" },
    { itemId: "b", prerequisiteId: "a" },
    { itemId: "c", prerequisiteId: "a" },
  ]);
  assert.equal(wouldCreateCycle("b", "c", map), false);
});

console.log("\nqueue model (§6.3, §6.4, §13)");

test("ready vs blocked partitioning", () => {
  const items = [
    item({ id: "p1", status: "in_progress" }),
    item({ id: "p2", status: "queued", position: 1 }),
    item({
      id: "p3",
      status: "queued",
      position: 2,
      blockedBy: [ref("p1", "in_progress")],
    }),
    item({
      id: "p4",
      status: "queued",
      position: 3,
      blockedBy: [ref("x", "done")],
    }),
    item({ id: "p5", status: "backlog" }),
    item({ id: "p6", status: "done" }),
  ];
  const model = buildQueueModel(items);
  assert.deepEqual(model.inProgress.map((i) => i.id), ["p1"]);
  // p2 (no deps) and p4 (deps done) are ready, in position order.
  assert.deepEqual(model.ready.map((i) => i.id), ["p2", "p4"]);
  assert.deepEqual(model.blocked.map((i) => i.id), ["p3"]);
  assert.equal(model.nextUpId, "p2");
});

test("next up skips blocked items at the front of the queue", () => {
  const items = [
    item({ id: "a", status: "queued", position: 1, blockedBy: [ref("b", "queued")] }),
    item({ id: "b", status: "queued", position: 2 }),
    item({ id: "c", status: "queued", position: 3 }),
  ];
  const model = buildQueueModel(items);
  assert.equal(model.nextUpId, "b");
});

test("no queued items → no next up", () => {
  const model = buildQueueModel([item({ id: "a", status: "in_progress" })]);
  assert.equal(model.nextUpId, null);
  assert.equal(model.ready.length, 0);
});

test("dropped prerequisites satisfy dependencies", () => {
  const items = [
    item({ id: "a", status: "queued", position: 1, blockedBy: [ref("b", "dropped")] }),
  ];
  const model = buildQueueModel(items);
  assert.deepEqual(model.ready.map((i) => i.id), ["a"]);
});

test("orderedQueued interleaves by position", () => {
  const items = [
    item({ id: "c", status: "queued", position: 3 }),
    item({ id: "a", status: "queued", position: 1 }),
    item({ id: "b", status: "queued", position: 2 }),
    item({ id: "d", status: "backlog" }),
  ];
  assert.deepEqual(orderedQueued(items).map((i) => i.id), ["a", "b", "c"]);
});

console.log("\nposition arithmetic (§24)");

test("positionBetween places values between neighbors", () => {
  assert.equal(positionBetween(null, null), 1);
  assert.equal(positionBetween(null, 2), 1);
  assert.equal(positionBetween(2, null), 3);
  assert.equal(positionBetween(1, 3), 2);
});

test("positionBetween returns null when the gap is exhausted", () => {
  assert.equal(positionBetween(1, 1 + 1e-9), null);
});

test("renormalizedPositions yields an even 1..n sequence", () => {
  assert.deepEqual(renormalizedPositions(3), [1, 2, 3]);
});

test("nextPosition appends after the current last", () => {
  assert.equal(nextPosition([]), 1);
  assert.equal(nextPosition([1, 2, 5]), 6);
});

console.log(`\nAll ${passed} domain tests passed.`);
