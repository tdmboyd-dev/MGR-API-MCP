import assert from "node:assert/strict";
import test from "node:test";
import { ActionSentinel } from "../src/action-sentinel.js";
import type { Approval, ToolCapability } from "../src/contracts.js";

const tool: ToolCapability = {
  id: "publish",
  version: "1",
  description: "publish an artifact",
  sideEffect: "irreversible",
  requiredScopes: ["publish:write"],
  approvalPolicy: "policy",
};

const auth = {
  actorId: "a",
  tenantId: "t",
  audience: "https://api.mgr.test/mcp",
  scopes: ["publish:write"],
  expiresAt: 1000,
};

test("sentinel requires approval for high-risk irreversible action", () => {
  const decision = new ActionSentinel().evaluate(auth, {
    taskId: "task",
    tool,
    payload: { assetId: "a1" },
    audience: "https://api.mgr.test/mcp",
    risk: "high",
  }, undefined, 100);
  assert.equal(decision.state, "REQUIRE_APPROVAL");
});

test("sentinel denies an approval bound to a different payload", () => {
  const sentinel = new ActionSentinel();
  const proposed = {
    taskId: "task",
    tool,
    payload: { assetId: "a2" },
    audience: "https://api.mgr.test/mcp",
    risk: "high" as const,
  };
  const digestForOtherPayload = sentinel.evaluate(auth, {
    ...proposed,
    payload: { assetId: "a1" },
  }, undefined, 100).actionDigest;

  const approval: Approval = {
    id: "approval-1",
    taskId: "task",
    actionDigest: digestForOtherPayload,
    state: "approved",
    approvedBy: "owner",
  };

  assert.equal(sentinel.evaluate(auth, proposed, approval, 100).state, "DENY");
});

test("sentinel denies missing scopes before approval logic", () => {
  const decision = new ActionSentinel().evaluate(
    { ...auth, scopes: [] },
    {
      taskId: "task",
      tool,
      payload: { assetId: "a1" },
      audience: "https://api.mgr.test/mcp",
      risk: "high",
    },
    undefined,
    100,
  );
  assert.equal(decision.state, "DENY");
});
