import assert from "node:assert/strict";
import test from "node:test";
import { actionDigest, approvalMatches } from "../src/security.js";
import { assertJobTransition, assertTaskTransition, canTransitionTask } from "../src/state.js";

test("task lifecycle blocks terminal-state resurrection", () => {
  assert.equal(canTransitionTask("queued", "running"), true);
  assert.equal(canTransitionTask("completed", "running"), false);
  assert.throws(() => assertTaskTransition("completed", "running"));
});

test("job unknown external state must reconcile before final truth", () => {
  assertJobTransition("running", "unknown_external_state");
  assertJobTransition("unknown_external_state", "completed");
  assert.throws(() => assertJobTransition("completed", "unknown_external_state"));
});

test("approval is bound to the exact canonical action payload", () => {
  const action = { tool: "publish", input: { id: "asset-1", channel: "site" } };
  const digest = actionDigest(action);
  assert.equal(approvalMatches({ input: { channel: "site", id: "asset-1" }, tool: "publish" }, digest), true);
  assert.equal(approvalMatches({ tool: "publish", input: { id: "asset-2", channel: "site" } }, digest), false);
});
